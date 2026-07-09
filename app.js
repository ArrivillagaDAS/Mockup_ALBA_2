/* ============================================================
   CUIDO+ — NÚCLEO DE LA APP (router + utilidades compartidas)
   ============================================================ */
const VIEWS = {};

function icon(id, extraClass){ return '<svg class="icon '+(extraClass||'')+'"><use href="#'+id+'"/></svg>'; }

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}

/* ---------------- Modal genérico (reemplaza confirm()/alert()) ---------------- */
function cerrarModal(){ document.getElementById('modal-layer').innerHTML = ''; }
function modalConfirmar({titulo, texto, textoOk, peligro, onOk}){
  const layer = document.getElementById('modal-layer');
  layer.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) cerrarModal()">
      <div class="modal-box">
        <h3>${titulo}</h3>
        <p>${texto}</p>
        <div class="modal-acciones">
          <button class="btn btn-ghost" onclick="cerrarModal()">Cancelar</button>
          <button class="btn ${peligro?'btn-danger':'btn-brand'}" id="modal-ok-btn">${textoOk||'Confirmar'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modal-ok-btn').onclick = ()=>{ cerrarModal(); onOk && onOk(); };
}

/* ---------------- Router ---------------- */
function ir(ruta){ location.hash = ruta; }
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', iniciar);

function iniciar(){
  aplicarPreferencias();
  const s = Sesion.obtener();
  if(!s){ location.hash = '#onb/bienvenida'; }
  else if(!location.hash){ location.hash = '#' + s.rol + '/inicio'; }
  render();
  iniciarMotorAlarma();
  CANAL.escuchar((key)=>{
    // Cualquier cambio de datos hecho por la otra cuenta refresca esta vista al instante
    if(!key) { render(); return; }
    if(key.startsWith('cp_datos_') || key==='cp_familias' || key==='cp_sesion') render();
  });
}

function render(){
  const hash = (location.hash || '#onb/bienvenida').replace('#','');
  const [seccion, pagina] = hash.split('/');
  const root = document.getElementById('app-root');
  const key = seccion + '/' + pagina;
  const vista = VIEWS[key];
  if(!vista){ root.innerHTML = VIEWS['onb/bienvenida'](); return; }
  root.innerHTML = vista();
  root.scrollTop = 0;
}

/* ---------------- Preferencias visuales (tema / letra / contraste) ---------------- */
function rolActivo(){
  const s = Sesion.obtener();
  return s ? s.rol : 'onb';
}
function aplicarPreferencias(){
  const rol = rolActivo()==='onb' ? 'ua' : rolActivo();
  const p = Prefs.obtener(rol);
  document.documentElement.setAttribute('data-theme', p.tema);
  document.documentElement.setAttribute('data-letra', p.letra);
  document.documentElement.setAttribute('data-contraste', p.contraste);
}
function cambiarPref(cambios){
  const rol = rolActivo()==='onb' ? 'ua' : rolActivo();
  Prefs.set(rol, cambios);
  aplicarPreferencias();
  render();
}

/* ---------------- Piezas de UI reutilizables entre vistas ---------------- */
function topbar(titulo, volverA, subt){
  return `<div class="topbar">
    <button class="btn-back" onclick="ir('${volverA}')" aria-label="Volver">${icon('i-back')}</button>
    <div class="titulo-vista">${titulo}${subt? '<small>'+subt+'</small>':''}</div>
  </div>`;
}

function navUC(activo){
  const items = [
    ['inicio','i-home','Inicio'],['medicamentos','i-pill','Medicinas'],
    ['agenda','i-calendar','Agenda'],['biblioteca','i-book','Guías'],['ajustes','i-gear','Ajustes']
  ];
  return `<nav class="barra-nav">${items.map(([id,ic,lbl])=>`
    <button class="nav-link ${activo===id?'activo':''}" onclick="ir('#uc/${id}')">${icon(ic)}<span>${lbl}</span></button>
  `).join('')}</nav>`;
}
function navUA(activo){
  const items = [
    ['inicio','i-home','Inicio'],['medicinas','i-pill','Medicinas'],
    ['citas','i-calendar','Citas'],['biblioteca','i-book','Guías'],['ajustes','i-gear','Ajustes']
  ];
  return `<nav class="barra-nav">${items.map(([id,ic,lbl])=>`
    <button class="nav-link ${activo===id?'activo':''}" onclick="ir('#ua/${id}')">${icon(ic)}<span>${lbl}</span></button>
  `).join('')}</nav>`;
}

function familiaSesion(){
  const s = Sesion.obtener();
  if(!s) return null;
  return Familia.obtener(s.familyId);
}
function datosSesion(){
  const s = Sesion.obtener();
  if(!s) return null;
  return Datos.get(s.familyId);
}

function cerrarSesion(){
  modalConfirmar({
    titulo:'¿Cerrar sesión?',
    texto:'Volverás a la pantalla de inicio. Tu familia y tus datos se guardan y no se pierden.',
    textoOk:'Cerrar sesión', peligro:true,
    onOk:()=>{ Sesion.cerrar(); location.hash='#onb/bienvenida'; render(); }
  });
}

/* ---------------- Comprimir imagen subida (fotos de recetas) ---------------- */
function leerImagenComprimida(file, cb){
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      const max = 640;
      let {width, height} = img;
      if(width > max || height > max){
        const ratio = Math.min(max/width, max/height);
        width = Math.round(width*ratio); height = Math.round(height*ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      cb(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------------- Motor de alarmas (revisa medicinas pendientes de la UA) ---------------- */
function iniciarMotorAlarma(){
  setInterval(()=>{
    const s = Sesion.obtener();
    if(!s || s.rol !== 'ua') return;
    const seccion = (location.hash||'').replace('#','').split('/')[0];
    if(seccion !== 'ua') return;
    if((location.hash||'').includes('ua/alarma')) return;
    const datos = Datos.get(s.familyId);
    if(!datos) return;
    const ahora = new Date();
    const hh = ahora.getHours()%12===0 ? 12 : ahora.getHours()%12;
    const periodoAhora = ahora.getHours() < 12 ? 'AM' : 'PM';
    const mm = ahora.getMinutes();
    const pendiente = datos.medicamentos.find(m=>{
      if(m.historial && m.historial[hoyISO()]) return false;
      return String(parseInt(m.hora,10)) === String(hh) && parseInt(m.minuto,10) === mm && m.periodo === periodoAhora;
    });
    if(pendiente){ window._alarmaActual = pendiente.id; ir('#ua/alarma'); }
  }, 20000);
}
