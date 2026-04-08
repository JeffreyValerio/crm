const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IS_CI = process.env.CI === 'true';

function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForGrid(page, maxSec = 20) {
  for (let t = 0; t < maxSec; t++) {
    await waitMs(1000);
    const info = await page.evaluate(() => {
      const grid = Ext.ComponentQuery.query('gridpanel').find(g => !g.isHidden() && g.getStore().getCount() > 0);
      if (!grid) return null;
      return { id: grid.getId(), count: grid.getStore().getCount(), total: grid.getStore().getTotalCount() };
    });
    if (info) return info;
  }
  return null;
}

async function collectAllPages(page, gridId, pageSize, totalCount) {
  const totalPages = Math.ceil(totalCount / pageSize);
  console.log(`Paginando: ${totalCount} registros en ${totalPages} páginas de ${pageSize}`);

  // Recopilar página 1 (ya cargada)
  await page.evaluate((gid) => {
    const store = Ext.getCmp(gid).getStore();
    window.__allRecords = [];
    for (let i = 0; i < store.getCount(); i++) {
      window.__allRecords.push(store.getAt(i).getData());
    }
  }, gridId);
  console.log(`  Página 1/${totalPages}: ${pageSize} registros`);

  // Páginas 2..N
  for (let p = 2; p <= totalPages; p++) {
    await page.evaluate((gid, pg) => {
      Ext.getCmp(gid).getStore().loadPage(pg);
    }, gridId, p);

    // Esperar a que la página cargue
    for (let t = 0; t < 15; t++) {
      await waitMs(1000);
      const loaded = await page.evaluate((gid) => Ext.getCmp(gid).getStore().getCount(), gridId);
      if (loaded > 0) break;
    }

    const added = await page.evaluate((gid) => {
      const store = Ext.getCmp(gid).getStore();
      const recs = [];
      for (let i = 0; i < store.getCount(); i++) {
        recs.push(store.getAt(i).getData());
      }
      window.__allRecords.push(...recs);
      return recs.length;
    }, gridId);

    const total = await page.evaluate(() => window.__allRecords.length);
    console.log(`  Página ${p}/${totalPages}: ${added} registros (acum: ${total})`);
  }

  return await page.evaluate(() => window.__allRecords);
}

function mapRecord(d) {
  const ivr = d.ivrTask || {};
  return {
    nro_orden:         d.numeroOrden || '',
    cliente:           d.nombreCliente || '',
    estado:            d.estado || '',
    prioridad:         d.prioridad || '',
    id_cliente:        d.identificacionCliente || '',
    contrato:          d.numeroContrato || '',
    contrato_ligado:   d.contratoLigado || '',
    tipo_orden:        d.tipoOrden || '',
    tipo_servicio:     d.tipoServicio || '',
    tipo_averia:       d.tipoAveria || '',
    motivo:            d.motivo || '',
    descripcion:       d.descripcion || '',
    tecnico:           d.tecnicoAsignado || '',
    usuario_creador:   d.nombreUsuarioCrea || '',
    usuario_envio:     d.usrDomain || '',
    contacto_nombre:   d.nombreContacto || '',
    contacto_apellido: d.apellidoContacto || '',
    tel_celular:       d.telefonoCelular || ivr.telefonoCelular || '',
    tel_instalacion:   d.telefonoInstalacion || ivr.telefonoInstalacion || '',
    tel_oficina:       d.telefonoOficina || ivr.telefonoOficina || '',
    email:             d.emailCliente || '',
    sucursal:          d.sucursal || '',
    despacho:          d.despacho || '',
    provincia:         d.nombreProvincia || '',
    canton:            d.nombreCanton || '',
    distrito:          d.nombreDistrito || '',
    barrio:            d.nombreBarrio || '',
    direccion:         d.direccionActivo || d.detalleDireccion || '',
    observaciones:     d.descripcionTrabajo || d.detalleTrabajoRealizado || '',
    bandera_cable:     d.banderaCable || '',
    bandera_internet:  d.banderaInternet || '',
    facturador:        d.facturadorIngenieria || '',
    tap:               d.numeroTap || '',
    placa:             d.placa || '',
    poste:             d.poste || '',
    latitud:           d.latitud || '',
    longitud:          d.longitud || '',
  };
}

(async () => {
  const launchOptions = {
    headless: IS_CI ? 'new' : false,
    defaultViewport: IS_CI ? { width: 1280, height: 900 } : null,
    args: IS_CI ? [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ] : [],
  };

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // Interceptar y modificar requests al workorder para forzar dispatch=TODOS
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (url.includes('workorder/newget')) {
        // Reemplazar dispatch por TODOS en la URL
        const modified = new URL(url);
        modified.searchParams.delete('dispatch');  // sin filtro de despacho
        modified.searchParams.set('estado', 'ASIGNADA');
        // Quitar page/start para que traiga todo
        // modified.searchParams.delete('page');
        // modified.searchParams.delete('start');
        const newUrl = modified.toString();
        if (newUrl !== url) console.log('[MOD]', newUrl.substring(0, 250));
        req.continue({ url: newUrl });
      } else {
        req.continue();
      }
    });
    page.on('response', async resp => {
      if (resp.url().includes('workorder/newget')) {
        try {
          const text = await resp.text();
          // Log estructura de la respuesta para entender el formato
          const preview = text.substring(0, 300);
          console.log(`[RESP preview] ${preview}`);
        } catch {}
      }
    });

    // Login
    await page.goto('https://fieldservice.cabletica.com/dispatchFS/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.x-form-field', { timeout: 15000 });
    const loginInputs = await page.$$('input.x-form-field');
    await loginInputs[0].type('ITS');
    await loginInputs[1].type('ITS2016');
    await page.evaluate(() => {
      [...document.querySelectorAll('a,span,button')].find(e => e.textContent.trim() === 'Entrar').click();
    });
    await waitMs(5000);

    // Log tabs disponibles
    const tabs = await page.evaluate(() =>
      Ext.ComponentQuery.query('tab').map(t => t.getText ? t.getText() : '').filter(Boolean)
    );
    console.log('Tabs disponibles:', tabs);

    // Intentar pestaña "Lista" primero
    const hasLista = await page.evaluate(() => {
      const tab = Ext.ComponentQuery.query('tab').find(t => t.getText && t.getText() === 'Lista');
      if (!tab) return false;
      tab.el.dom.click();
      return true;
    });

    if (hasLista) {
      console.log('Cargando pestaña Lista...');
      await waitMs(3000);
    } else {
      // Fallback a Buscar
      console.log('Pestaña Lista no encontrada, usando Buscar...');
      await page.evaluate(() => {
        const tab = Ext.ComponentQuery.query('tab').find(t => t.getText && t.getText() === 'Buscar');
        if (tab) tab.el.dom.click();
      });
      await waitMs(3000);
    }

    // Log combos disponibles para debug
    const combos = await page.evaluate(() =>
      Ext.ComponentQuery.query('combobox').map(c => ({ label: c.fieldLabel, value: c.getValue() }))
    );
    console.log('Combos en formulario:', JSON.stringify(combos, null, 2));

    // Setear combos en la UI
    await page.evaluate(() => {
      const combos = Ext.ComponentQuery.query('combobox');
      const estadoCombo = combos.find(c => c.fieldLabel === 'Estado');
      if (estadoCombo) estadoCombo.setValue('ASIGNADA');
      const despachoCombo = combos.find(c => c.fieldLabel === 'Despacho' && !c.isHidden());
      if (despachoCombo) despachoCombo.setValue('TODOS');
    });
    await waitMs(300);

    // Inspeccionar y actualizar extraParams del store directamente
    const extraParamsBefore = await page.evaluate(() => {
      const grid = Ext.getCmp('grid-1046') || Ext.ComponentQuery.query('gridpanel').find(g => !g.isHidden());
      const proxy = grid.getStore().getProxy();
      return JSON.stringify(proxy.extraParams || {});
    });
    console.log('extraParams antes:', extraParamsBefore);

    await page.evaluate(() => {
      const grid = Ext.ComponentQuery.query('gridpanel').find(g => !g.isHidden() && g.getStore().getProxy().url && g.getStore().getProxy().url.includes('workorder'));
      if (!grid) return;
      const proxy = grid.getStore().getProxy();
      const params = proxy.extraParams || {};
      // Sobreescribir despacho a TODOS y estado a ASIGNADA
      params.dispatch = 'TODOS';
      params.estado = 'ASIGNADA';
      proxy.extraParams = params;
    });

    const extraParamsAfter = await page.evaluate(() => {
      const grid = Ext.ComponentQuery.query('gridpanel').find(g => !g.isHidden() && g.getStore().getProxy().url && g.getStore().getProxy().url.includes('workorder'));
      return JSON.stringify(grid.getStore().getProxy().extraParams || {});
    });
    console.log('extraParams después:', extraParamsAfter);

    // Hacer click en el botón Buscar visible
    const btnClicked = await page.evaluate(() => {
      const btns = Ext.ComponentQuery.query('button').filter(
        b => b.getText && b.getText() === 'Buscar' && !b.isHidden()
      );
      if (btns.length === 0) return false;
      btns[0].el.dom.click();
      return true;
    });
    console.log('Botón Buscar clickeado:', btnClicked);

    // Esperar que el grid recargue tras el click
    await waitMs(3000);

    // Log todos los grids visibles y sus conteos, e info del store/proxy
    const allGrids = await page.evaluate(() =>
      Ext.ComponentQuery.query('gridpanel')
        .filter(g => !g.isHidden())
        .map(g => {
          const store = g.getStore();
          const proxy = store.getProxy ? store.getProxy() : null;
          return {
            id: g.getId(),
            count: store.getCount(),
            total: store.getTotalCount(),
            proxyUrl: proxy && proxy.url ? proxy.url : null,
            storeType: store.$className || store.type,
            isFiltered: store.isFiltered ? store.isFiltered() : null,
          };
        })
    );
    console.log('Grids visibles:', JSON.stringify(allGrids, null, 2));

    // Esperar grid con resultados
    const gridInfo = await waitForGrid(page, 30);
    if (!gridInfo) throw new Error('Timeout esperando grid con resultados');

    console.log(`Grid encontrado: id=${gridInfo.id}, count=${gridInfo.count}, total=${gridInfo.total}`);

    let allRawRecords;

    if (gridInfo.total > gridInfo.count) {
      // Hay más páginas
      allRawRecords = await collectAllPages(page, gridInfo.id, gridInfo.count, gridInfo.total);
    } else {
      // Todo en una página, intentar ampliar a pageSize grande
      await page.evaluate((gid) => {
        const store = Ext.getCmp(gid).getStore();
        store.pageSize = 9999;
        store.loadPage(1);
      }, gridInfo.id);

      for (let t = 0; t < 30; t++) {
        await waitMs(1000);
        const c = await page.evaluate((gid) => Ext.getCmp(gid).getStore().getCount(), gridInfo.id);
        if (c > 0) break;
      }

      const afterBig = await page.evaluate((gid) => {
        const store = Ext.getCmp(gid).getStore();
        return { count: store.getCount(), total: store.getTotalCount() };
      }, gridInfo.id);
      console.log(`Después de pageSize=9999: count=${afterBig.count}, total=${afterBig.total}`);

      if (afterBig.total > afterBig.count) {
        allRawRecords = await collectAllPages(page, gridInfo.id, afterBig.count, afterBig.total);
      } else {
        allRawRecords = await page.evaluate((gid) => {
          const store = Ext.getCmp(gid).getStore();
          const recs = [];
          for (let i = 0; i < store.getCount(); i++) recs.push(store.getAt(i).getData());
          return recs;
        }, gridInfo.id);
      }
    }

    const results = allRawRecords.map(mapRecord);
    const outPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`✓ Scraper: ${results.length} registros guardados en scripts/data.json`);
  } finally {
    await browser.close();
  }
})();
