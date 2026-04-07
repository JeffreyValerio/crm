const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IS_CI = process.env.CI === 'true';

async function setComboByLabel(page, label, value) {
  await page.evaluate((lbl, val) => {
    const combo = Ext.ComponentQuery.query('combobox').find(c => c.fieldLabel === lbl);
    if (!combo) throw new Error('Combo no encontrado: ' + lbl);
    combo.setValue(val);
  }, label, value);
}

async function clickSidebarBuscar(page) {
  await page.evaluate(() => {
    const tab = Ext.ComponentQuery.query('tab').find(t => t.getText && t.getText() === 'Buscar');
    tab.el.dom.click();
  });
  for (let t = 0; t < 10; t++) {
    await new Promise(r => setTimeout(r, 1000));
    const ready = await page.evaluate(() =>
      !!Ext.ComponentQuery.query('combobox').find(c => c.fieldLabel === 'Estado')
    );
    if (ready) return;
  }
  throw new Error('Timeout esperando formulario de Buscar');
}

async function runSearch(page) {
  await setComboByLabel(page, 'Estado', 'ASIGNADA');
  await setComboByLabel(page, 'Despacho', 'TODOS');
  await new Promise(r => setTimeout(r, 300));
  const btnId = await page.evaluate(() => {
    const btn = Ext.ComponentQuery.query('button')
      .filter(b => b.xtype === 'button' && b.getText && b.getText() === 'Buscar' && !b.isHidden());
    return btn.length > 0 ? btn[0].getId() : null;
  });
  if (!btnId) throw new Error('Botón Buscar no encontrado');
  await page.evaluate((id) => document.querySelector('#' + id).click(), btnId);

  // Esperar a que aparezca el grid con resultados
  let gridId = null;
  for (let t = 0; t < 15; t++) {
    await new Promise(r => setTimeout(r, 1000));
    gridId = await page.evaluate(() => {
      const grid = Ext.ComponentQuery.query('gridpanel').find(g => g.getStore().getCount() > 0);
      return grid ? grid.getId() : null;
    });
    if (gridId) break;
  }
  if (!gridId) throw new Error('Timeout esperando resultados');

  // Forzar pageSize grande y recargar para traer todos los registros
  const total = await page.evaluate((gid) => {
    const store = Ext.getCmp(gid).getStore();
    return store.getTotalCount();
  }, gridId);
  console.log(`Total en servidor: ${total}. Recargando con pageSize=${total}...`);

  await page.evaluate((gid, total) => {
    const store = Ext.getCmp(gid).getStore();
    store.pageSize = total;
    store.loadPage(1);
  }, gridId, total);

  // Esperar a que el store tenga todos los registros
  for (let t = 0; t < 30; t++) {
    await new Promise(r => setTimeout(r, 1000));
    const count = await page.evaluate((gid) => Ext.getCmp(gid).getStore().getCount(), gridId);
    if (count >= total) break;
  }

  return gridId;
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
    // Login
    await page.goto('https://fieldservice.cabletica.com/dispatchFS/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.x-form-field', { timeout: 15000 });
    const loginInputs = await page.$$('input.x-form-field');
    await loginInputs[0].type('ITS');
    await loginInputs[1].type('ITS2016');
    await page.evaluate(() => {
      [...document.querySelectorAll('a,span,button')].find(e => e.textContent.trim() === 'Entrar').click();
    });
    await new Promise(r => setTimeout(r, 5000));

    // Buscar con filtros
    await clickSidebarBuscar(page);
    const gridId = await runSearch(page);

    // Extraer todos los registros del store
    const results = await page.evaluate((gid) => {
      const grid = Ext.getCmp(gid);
      const store = grid.getStore();
      const records = [];

      for (let i = 0; i < store.getCount(); i++) {
        const d = store.getAt(i).getData();
        const ivr = d.ivrTask || {};

        records.push({
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
        });
      }
      return records;
    }, gridId);

    const outPath = path.join(__dirname, 'data.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`✓ Scraper: ${results.length} registros guardados en scripts/data.json`);
  } finally {
    await browser.close();
  }
})();
