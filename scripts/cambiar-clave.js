/**
 * Cambia la contraseña en fieldservice.cabletica.com
 * Uso: node scripts/cambiar-clave.js
 */

const puppeteer = require('puppeteer');

const URL_BASE     = 'https://fieldservice.cabletica.com/dispatchFS/';
const USUARIO      = 'ITS';
const CLAVE_ACTUAL = 'ITS2016';
const CLAVE_NUEVA  = 'sinclave';

function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  // Interceptar POST requests y sus respuestas
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log('[POST]', req.url());
      console.log('  body:', (req.postData() || '').substring(0, 200));
    }
    req.continue();
  });
  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      try {
        const txt = await resp.text();
        console.log('[RESP]', resp.url().split('/').pop(), resp.status(), txt.substring(0, 300));
      } catch(e) {}
    }
  });

  try {
    // Login
    console.log('Abriendo página...');
    await page.goto(URL_BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input.x-form-field', { timeout: 15000 });

    const loginInputs = await page.$$('input.x-form-field');
    await loginInputs[0].type(USUARIO);
    await loginInputs[1].type(CLAVE_ACTUAL);
    await page.evaluate(() => {
      var els = document.querySelectorAll('a,span,button');
      for (var i = 0; i < els.length; i++) {
        if (els[i].textContent.trim() === 'Entrar') { els[i].click(); break; }
      }
    });

    console.log('Esperando dashboard...');
    await waitMs(5000);

    // Click en Ajustes por DOM
    console.log('Entrando a Ajustes...');
    await page.evaluate(() => {
      var els = document.querySelectorAll('*');
      for (var i = 0; i < els.length; i++) {
        if (els[i].children.length === 0 && els[i].textContent.trim() === 'Ajustes') {
          els[i].click();
        }
      }
    });
    await waitMs(2000);

    // Click en Mi cuenta
    console.log('Entrando a Mi cuenta...');
    await page.evaluate(() => {
      var els = document.querySelectorAll('*');
      for (var i = 0; i < els.length; i++) {
        if (els[i].children.length === 0 && els[i].textContent.trim() === 'Mi cuenta') {
          els[i].click();
        }
      }
    });
    await waitMs(2000);

    // Esperar un poco más para que el form de Mi cuenta cargue
    await waitMs(2000);

    // Setear campos via ExtJS setValue — buscar por inputType en el componente
    console.log('Seteando valores...');
    var setResult = await page.evaluate(function(actual, nueva) {
      var campos = Ext.ComponentQuery.query('textfield');
      var pwds = [];
      for (var i = 0; i < campos.length; i++) {
        var c = campos[i];
        // Intentar por inputType del componente
        if (c.inputType === 'password') { pwds.push(c); continue; }
        // Intentar por el DOM del input
        try {
          var el = c.inputEl || (c.getInputEl ? c.getInputEl() : null);
          if (el && el.dom && el.dom.type === 'password') { pwds.push(c); }
        } catch(e) {}
      }
      if (pwds.length < 3) {
        // Log todos los campos para debug
        var info = campos.map(function(c) {
          return c.getId() + ' inputType=' + c.inputType + ' label=' + c.fieldLabel;
        });
        return 'Solo ' + pwds.length + ' | todos: ' + info.join(' | ');
      }
      pwds[0].setValue(actual);
      pwds[1].setValue(nueva);
      pwds[2].setValue(nueva);
      for (var j = 0; j < pwds.length; j++) {
        if (pwds[j].validate) pwds[j].validate();
        if (pwds[j].checkChange) pwds[j].checkChange();
      }
      return 'OK ' + pwds.length + ' campos: ' + pwds.map(function(p) { return p.getId(); }).join(', ');
    }, CLAVE_ACTUAL, CLAVE_NUEVA);
    console.log('setValue:', setResult);

    await waitMs(500);

    // Inspeccionar el botón y el form
    console.log('Inspeccionando botón y form...');
    var info = await page.evaluate(function() {
      var btns = Ext.ComponentQuery.query('button');
      var btn = null;
      for (var i = 0; i < btns.length; i++) {
        var txt = btns[i].text || '';
        if (txt.indexOf('Cambiar') !== -1 || txt.indexOf('clave') !== -1) {
          btn = btns[i]; break;
        }
      }

      var forms = Ext.ComponentQuery.query('form');
      var formUrl = '';
      for (var f = 0; f < forms.length; f++) {
        var extForm = forms[f].getForm ? forms[f].getForm() : null;
        if (extForm && extForm.url) { formUrl = extForm.url; break; }
      }

      return {
        btnId: btn ? btn.getId() : null,
        btnText: btn ? btn.text : null,
        btnDisabled: btn ? btn.isDisabled() : null,
        btnHandler: btn && btn.handler ? btn.handler.toString().substring(0, 400) : null,
        formUrl: formUrl,
        formCount: forms.length,
      };
    });
    console.log('Info:', JSON.stringify(info, null, 2));

    // Llamar cambiarClave() en el scope del botón
    if (info.btnId) {
      var envioResult = await page.evaluate(function(btnId) {
        var btn = Ext.getCmp(btnId);
        if (!btn) return 'btn no encontrado';

        var scope = btn.scope || btn.up('form') || btn.up('panel');

        // handler es string "cambiarClave" — llamar en el scope
        if (typeof btn.handler === 'string' && scope && typeof scope[btn.handler] === 'function') {
          scope[btn.handler].call(scope, btn, {});
          return 'scope.' + btn.handler + '() llamado';
        }

        // Buscar en el controller de la vista
        var view = btn.up('panel') || btn.up('window');
        if (view) {
          var ctrl = view.getController ? view.getController() : null;
          if (ctrl && typeof ctrl['cambiarClave'] === 'function') {
            ctrl['cambiarClave'](btn, {});
            return 'controller.cambiarClave() llamado';
          }
        }

        // Intentar como global
        if (typeof window['cambiarClave'] === 'function') {
          window['cambiarClave'](btn, {});
          return 'window.cambiarClave() llamado';
        }

        // Último recurso: enable + fireEvent
        btn.enable();
        btn.fireEvent('click', btn, {});
        return 'enable + fireEvent click';
      }, info.btnId);
      console.log('Envío:', envioResult);
    }

    await waitMs(3000);
    await page.screenshot({ path: 'scripts/cambiar-clave-resultado.png' });
    console.log('Screenshot: scripts/cambiar-clave-resultado.png');

  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'scripts/cambiar-clave-error.png' }).catch(function() {});
  }

  console.log('Navegador abierto — cerralo manualmente.');
})();
