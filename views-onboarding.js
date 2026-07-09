/* ============================================================
   CUIDO+ — VISTAS DE BIENVENIDA Y VINCULACIÓN
   ============================================================ */

VIEWS['onb/bienvenida'] = function(){
  return `
    <div class="onb-wrap">
      <div class="onb-logo">C+</div>
      <div class="onb-titulo">Cuido+</div>
      <div class="onb-sub">Una cuenta para quien cuida y otra para quien es cuidado, siempre conectadas.</div>
      <div class="rol-opciones">
        <button class="rol-card" onclick="ir('#onb/uc-crear')">
          <div class="icono-wrap">${icon('i-users')}</div>
          <div><h3>Soy cuidador o familiar</h3><p>Crea la cuenta y organiza medicinas, citas y guías</p></div>
          ${icon('i-chevron')}
        </button>
        <button class="rol-card" onclick="ir('#onb/ua-vincular')">
          <div class="icono-wrap">${icon('i-heart')}</div>
          <div><h3>Soy el adulto mayor</h3><p>Ingresa el código que te dio tu cuidador</p></div>
          ${icon('i-chevron')}
        </button>
      </div>
    </div>
  `;
};

VIEWS['onb/uc-crear'] = function(){
  return `
    ${topbar('Crear cuenta', '#onb/bienvenida')}
    <div class="scroll-area">
      <p style="color:var(--muted);font-size:.88rem;margin-bottom:16px;">Completa estos datos para crear el espacio compartido de tu familia.</p>
      <div class="form-box">
        <div class="campo"><label>Tu nombre (cuidador)</label><input id="f-nombre-uc" placeholder="Ej. Elena Ramírez"></div>
        <div class="campo"><label>Nombre del adulto mayor</label><input id="f-nombre-ua" placeholder="Ej. Don José"></div>
        <div class="campo"><label>Tu teléfono (para el botón de emergencia)</label><input id="f-tel" placeholder="Ej. 5555-1234" inputmode="tel"></div>
      </div>
      <button class="btn btn-brand btn-block" onclick="crearFamilia()">${icon('i-plus')} Crear cuenta familiar</button>
      <p style="text-align:center;color:var(--muted);font-size:.78rem;margin-top:14px;">Al final recibirás un código de 6 letras para vincular el celular del adulto mayor.</p>
    </div>
  `;
};

function crearFamilia(){
  const nombreCuidador = document.getElementById('f-nombre-uc').value.trim();
  const nombreAnciano = document.getElementById('f-nombre-ua').value.trim();
  const telefono = document.getElementById('f-tel').value.trim();
  if(!nombreCuidador || !nombreAnciano){ toast('Escribe ambos nombres para continuar.'); return; }
  const fam = Familia.crear({nombreCuidador, nombreAnciano, telefono});
  Sesion.iniciar('uc', fam.id);
  ir('#uc/inicio');
  setTimeout(()=>toast('Cuenta creada. Encuentra el código de vínculo en Ajustes.'), 400);
}

VIEWS['onb/ua-vincular'] = function(){
  return `
    ${topbar('Vincular cuenta', '#onb/bienvenida')}
    <div class="scroll-area">
      <p style="color:var(--muted);font-size:.95rem;margin-bottom:18px;line-height:1.5;">Pídele a tu cuidador el código de 6 letras que aparece en su celular, en Ajustes.</p>
      <div class="codigo-input">
        ${[0,1,2,3,4,5].map(i=>`<input maxlength="1" class="dig-codigo" data-i="${i}" oninput="avanzarCodigo(this)">`).join('')}
      </div>
      <div id="vinc-error" style="color:var(--danger);text-align:center;font-weight:700;font-size:.85rem;min-height:20px;margin-bottom:10px;"></div>
      <button class="btn btn-brand btn-block" onclick="vincularConCodigo()">${icon('i-link')} Vincular</button>
    </div>
  `;
};

function avanzarCodigo(el){
  el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(el.value && el.nextElementSibling){ el.nextElementSibling.focus(); }
}
function vincularConCodigo(){
  const digitos = Array.from(document.querySelectorAll('.dig-codigo')).map(i=>i.value).join('');
  if(digitos.length < 6){ document.getElementById('vinc-error').textContent = 'Completa las 6 letras del código.'; return; }
  const fam = Familia.buscarPorCodigo(digitos);
  if(!fam){ document.getElementById('vinc-error').textContent = 'No encontramos ese código. Verifícalo con tu cuidador.'; return; }
  Sesion.iniciar('ua', fam.id);
  ir('#ua/inicio');
}
