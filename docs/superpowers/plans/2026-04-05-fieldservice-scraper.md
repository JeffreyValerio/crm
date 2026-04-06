# FieldService Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Iterar cada fila de la búsqueda (Estado=ASIGNADA, Despacho=TODOS) en fieldservice.cabletica.com, extraer datos del detalle de cada orden y guardarlos en `scripts/data.json`.

**Architecture:** Script Node.js standalone (`scripts/scraper.js`). Login → Buscar → filtrar → por cada fila: click fila, extraer campos del detalle con ExtJS ComponentQuery, click Buscar en sidebar para volver, repetir. Guardar JSON al final.

**Tech Stack:** Node.js 22, Puppeteer (ya instalado), ExtJS (en el sitio).

---

### Campos a extraer por registro

```
cliente, estado, prioridad, nro_orden, id_cliente, contrato, contrato_ligado,
tipo_orden, autoinstalacion, tecnico, motivo, usuario_envio, usuario_creador,
fecha_visita, fecha_creacion, fecha_llamada, nro_llamado, tipo_llamada, estado_llamada,
contacto_nombre, contacto_apellido, tel_celular, tel_instalacion, tel_oficina,
no_llamar_ivr, email, sucursal, despacho, provincia, canton, distrito, barrio,
direccion, observaciones, bandera_cable, bandera_internet, facturador, tap,
placa, poste, latitud, longitud
```

---

### Task 1: Identificar selectores del detalle

**Files:**
- Modify: `scripts/scraper.js`

- [ ] **Step 1: Agregar paso de inspección post-click de fila**

Después del login + búsqueda exitosa, clickar la primera fila y hacer dump de todos los `field` visibles con su `fieldLabel` y valor:

```javascript
// Dentro del script, después de que grid tiene datos:
const gridId = await page.evaluate(() => {
  return Ext.ComponentQuery.query('gridpanel').find(g => g.getStore().getCount() > 0).getId();
});

// Click fila 0
await page.evaluate((gid) => {
  const grid = Ext.getCmp(gid);
  const rowEl = grid.getView().getRow(0);
  rowEl.click();
}, gridId);

await new Promise(r => setTimeout(r, 3000));

// Dump campos del detalle
const fields = await page.evaluate(() => {
  return Ext.ComponentQuery.query('field').map(f => ({
    label: f.fieldLabel,
    value: f.getValue(),
    xtype: f.xtype,
    id: f.getId()
  })).filter(f => f.label);
});
console.log(JSON.stringify(fields, null, 2));
```

- [ ] **Step 2: Ejecutar y anotar qué fieldLabel corresponde a cada dato**

```bash
node scripts/scraper.js
```

Esperado: lista de objetos `{ label, value, xtype, id }` — identificar cuáles labels corresponden a los campos objetivo.

---

### Task 2: Función extractora del detalle

**Files:**
- Modify: `scripts/scraper.js`

- [ ] **Step 1: Escribir función `extractDetail(page)` basada en los labels encontrados**

```javascript
async function extractDetail(page) {
  return await page.evaluate(() => {
    const get = (label) => {
      const f = Ext.ComponentQuery.query('field').find(x => x.fieldLabel === label);
      return f ? (f.getRawValue ? f.getRawValue() : f.getValue()) : '';
    };

    // Contacto tiene dos campos sin label claro — usar posición o id
    const contactoFields = Ext.ComponentQuery.query('field').filter(f => !f.fieldLabel && f.xtype === 'textfield');

    return {
      cliente:           get('Cliente:') || get('Cliente'),
      estado:            get('Estado:') || get('Estado'),
      prioridad:         get('Prioridad:') || get('Prioridad'),
      nro_orden:         get('Nro. orden:') || get('Nro. orden'),
      id_cliente:        get('ID cliente:') || get('ID cliente'),
      contrato:          get('Contrato:') || get('Contrato'),
      contrato_ligado:   get('Contrato ligado:') || get('Contrato ligado'),
      tipo_orden:        get('Tipo orden:') || get('Tipo orden'),
      tecnico:           get('Técnico:') || get('Técnico'),
      motivo:            get('Motivo:') || get('Motivo'),
      usuario_envio:     get('Usuario envío:') || get('Usuario envío'),
      usuario_creador:   get('Usuario creador:') || get('Usuario creador'),
      fecha_visita:      get('Fecha visita:') || get('Fecha visita'),
      fecha_creacion:    get('Fecha creación:') || get('Fecha creación'),
      fecha_llamada:     get('Fecha llamada:') || get('Fecha llamada'),
      nro_llamado:       get('Nro llamado:') || get('Nro llamado'),
      tipo_llamada:      get('Tipo llamada:') || get('Tipo llamada'),
      estado_llamada:    get('Estado llamada:') || get('Estado llamada'),
      tel_celular:       get('Tel. celular:') || get('Tel. celular'),
      tel_instalacion:   get('Tel. instalación:') || get('Tel. instalación'),
      tel_oficina:       get('Tel. oficina:') || get('Tel. oficina'),
      email:             get('Email:') || get('Email'),
      sucursal:          get('Sucursal:') || get('Sucursal'),
      despacho:          get('Despacha:') || get('Despacho'),
      provincia:         get('Provincia:') || get('Provincia'),
      canton:            get('Cantón:') || get('Cantón'),
      distrito:          get('Distrito:') || get('Distrito'),
      barrio:            get('Barrio:') || get('Barrio'),
      direccion:         get('Dirección:') || get('Dirección'),
      observaciones:     get('Observaciones:') || get('Observaciones'),
      bandera_cable:     get('Bandera cable:') || get('Bandara cable'),
      bandera_internet:  get('Bandera Internet:') || get('Bandara Internet'),
      facturador:        get('Facturador:') || get('Facturador'),
      tap:               get('Tap:') || get('Tap'),
      placa:             get('Placa:') || get('Placa'),
      poste:             get('Poste:') || get('Poste'),
      latitud:           get('Latitud:') || get('Latitud'),
      longitud:          get('Longitud:') || get('Longitud'),
    };
  });
}
```

> Nota: Los labels exactos se ajustan según lo encontrado en Task 1.

- [ ] **Step 2: Ajustar labels según dump real del Task 1**

Reemplazar cualquier label que no coincida con el valor real observado.

---

### Task 3: Loop principal — iterar todas las filas

**Files:**
- Modify: `scripts/scraper.js`

- [ ] **Step 1: Escribir función `runSearch(page)` reutilizable**

```javascript
async function runSearch(page) {
  await clickByText(page, 'Buscar');  // sidebar
  await new Promise(r => setTimeout(r, 3000));
  await setComboByLabel(page, 'Estado', 'ASIGNADA');
  await setComboByLabel(page, 'Despacho', 'TODOS');
  await new Promise(r => setTimeout(r, 300));

  const buscarBtnId = await page.evaluate(() => {
    const btn = Ext.ComponentQuery.query('button').find(b =>
      b.getText && b.getText() === 'Buscar' && !b.isHidden()
    );
    return btn ? btn.getId() : null;
  });
  await page.evaluate((id) => document.querySelector('#' + id).click(), buscarBtnId);
  await new Promise(r => setTimeout(r, 4000));

  return await page.evaluate(() => {
    const grid = Ext.ComponentQuery.query('gridpanel').find(g => g.getStore().getCount() > 0);
    return grid ? grid.getId() : null;
  });
}
```

- [ ] **Step 2: Escribir el loop principal**

```javascript
const results = [];
const gridId = await runSearch(page);
const total = await page.evaluate((gid) => Ext.getCmp(gid).getStore().getCount(), gridId);

console.log(`Total filas: ${total}`);

for (let i = 0; i < total; i++) {
  console.log(`Procesando fila ${i + 1}/${total}...`);

  // Refrescar gridId (puede cambiar tras volver a la lista)
  const currentGridId = await page.evaluate(() => {
    const grid = Ext.ComponentQuery.query('gridpanel').find(g => g.getStore().getCount() > 0);
    return grid ? grid.getId() : null;
  });

  // Click en fila i
  await page.evaluate((gid, idx) => {
    const grid = Ext.getCmp(gid);
    const rowEl = grid.getView().getRow(idx);
    if (!rowEl) throw new Error('Fila no encontrada: ' + idx);
    rowEl.click();
  }, currentGridId, i);

  await new Promise(r => setTimeout(r, 3000));

  // Extraer datos
  const data = await extractDetail(page);
  results.push(data);
  console.log(`  -> ${data.nro_orden} | ${data.cliente}`);

  // Volver a la lista
  await clickByText(page, 'Buscar');
  await new Promise(r => setTimeout(r, 3000));

  // Re-ejecutar búsqueda para que aparezca la lista de nuevo
  await setComboByLabel(page, 'Estado', 'ASIGNADA');
  await setComboByLabel(page, 'Despacho', 'TODOS');
  const btnId = await page.evaluate(() => {
    const btn = Ext.ComponentQuery.query('button').find(b =>
      b.getText && b.getText() === 'Buscar' && !b.isHidden()
    );
    return btn ? btn.getId() : null;
  });
  await page.evaluate((id) => document.querySelector('#' + id).click(), btnId);
  await new Promise(r => setTimeout(r, 4000));
}
```

- [ ] **Step 3: Guardar JSON al terminar**

```javascript
const fs = require('fs');
fs.writeFileSync('scripts/data.json', JSON.stringify(results, null, 2), 'utf8');
console.log(`\nGuardado: scripts/data.json (${results.length} registros)`);
await browser.close();
```

- [ ] **Step 4: Ejecutar script completo**

```bash
node scripts/scraper.js
```

Esperado:
```
Total filas: 45
Procesando fila 1/45...
  -> 1-1602594413 | JORGE ANTONIO BETANCOURT PEREIRA
Procesando fila 2/45...
...
Guardado: scripts/data.json (45 registros)
```

- [ ] **Step 5: Verificar JSON**

```bash
node -e "const d=require('./scripts/data.json'); console.log(d.length, 'registros'); console.log(JSON.stringify(d[0], null, 2))"
```

Esperado: 45 registros, primer objeto con todos los campos poblados.

---

### Task 4: Manejo de errores y robustez

**Files:**
- Modify: `scripts/scraper.js`

- [ ] **Step 1: Envolver el loop en try/catch por fila**

Si una fila falla, guardar parcialmente y continuar:

```javascript
for (let i = 0; i < total; i++) {
  try {
    // ... lógica de extracción
  } catch (err) {
    console.error(`Error en fila ${i}: ${err.message}`);
    results.push({ _error: err.message, _fila: i });
    // Asegurarse de volver a la lista
    await clickByText(page, 'Buscar').catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    // Re-ejecutar búsqueda
    await setComboByLabel(page, 'Estado', 'ASIGNADA').catch(() => {});
    await setComboByLabel(page, 'Despacho', 'TODOS').catch(() => {});
    const btnId = await page.evaluate(() => {
      const btn = Ext.ComponentQuery.query('button').find(b =>
        b.getText && b.getText() === 'Buscar' && !b.isHidden()
      );
      return btn ? btn.getId() : null;
    }).catch(() => null);
    if (btnId) await page.evaluate((id) => document.querySelector('#' + id).click(), btnId).catch(() => {});
    await new Promise(r => setTimeout(r, 4000));
  }
}
```

- [ ] **Step 2: Guardar JSON incremental (checkpoint cada 10 filas)**

```javascript
if ((i + 1) % 10 === 0 || i === total - 1) {
  fs.writeFileSync('scripts/data.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(`  Checkpoint guardado (${results.length} registros)`);
}
```
