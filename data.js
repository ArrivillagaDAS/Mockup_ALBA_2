/* ============================================================
   CUIDO+ — CAPA DE DATOS
   Todo vive en localStorage, agrupado por "familia" (familyId).
   La cuenta Cuidador y la cuenta Abuelito leen y escriben la
   MISMA familia, así que lo que hace una se refleja en la otra.
   Para simular dos celulares distintos, escuchamos el evento
   "storage" (dispara en otras pestañas) y un BroadcastChannel
   (dispara también dentro del mismo navegador al instante).
   ============================================================ */

const DB = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v===null ? fallback : JSON.parse(v); }
    catch(e){ return fallback; }
  },
  set(key, val){
    localStorage.setItem(key, JSON.stringify(val));
    CANAL.avisar(key);
  }
};

const CANAL = (function(){
  let bc = null;
  try{ bc = new BroadcastChannel('cuido-plus'); }catch(e){ bc = null; }
  const listeners = [];
  if(bc){
    bc.onmessage = (ev)=>{ listeners.forEach(fn=>fn(ev.data)); };
  }
  window.addEventListener('storage', (ev)=>{ listeners.forEach(fn=>fn(ev.key)); });
  return {
    avisar(key){ if(bc){ try{ bc.postMessage(key); }catch(e){} } },
    escuchar(fn){ listeners.push(fn); }
  };
})();

function uid(prefijo){ return prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function generarCodigo(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 para evitar confusiones
  let c = '';
  for(let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)];
  return c;
}

function hoyISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function ayerISO(){ const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
function horaActual(){ const d=new Date(); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }
function formatoFecha(iso){
  if(!iso) return '--';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-GT', {day:'2-digit', month:'short'});
}
function iniciales(nombre){
  if(!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
}

/* ---------------- Familias (cuenta compartida cuidador/abuelito) ---------------- */
const Familia = {
  todas(){ return DB.get('cp_familias', {}); },
  guardarTodas(f){ DB.set('cp_familias', f); },
  obtener(id){ return this.todas()[id] || null; },
  crear({nombreCuidador, nombreAnciano, telefono}){
    const familias = this.todas();
    const id = uid('fam_');
    let codigo = generarCodigo();
    while(Object.values(familias).some(f=>f.codigo===codigo)) codigo = generarCodigo();
    familias[id] = {
      id, codigo, nombreCuidador, nombreAnciano, telefono: telefono||'',
      creado: Date.now()
    };
    this.guardarTodas(familias);
    Datos.inicializar(id);
    return familias[id];
  },
  buscarPorCodigo(codigo){
    const familias = this.todas();
    return Object.values(familias).find(f => f.codigo === (codigo||'').toUpperCase().trim()) || null;
  },
  actualizar(id, cambios){
    const familias = this.todas();
    if(!familias[id]) return;
    Object.assign(familias[id], cambios);
    this.guardarTodas(familias);
  }
};

/* ---------------- Datos de cada familia (medicinas, citas, etc.) ---------------- */
const Datos = {
  clave(familyId){ return 'cp_datos_' + familyId; },
  inicializar(familyId){
    if(DB.get(this.clave(familyId))) return;
    DB.set(this.clave(familyId), {
      medicamentos:[
        {id:'m1', nombre:'Losartán', dosis:'100mg', cantidadTexto:'1 pastilla', hora:'08', minuto:'00', periodo:'AM', stock:18, stockMin:5, historial:{}},
        {id:'m2', nombre:'Metformina', dosis:'850mg', cantidadTexto:'1 pastilla', hora:'02', minuto:'00', periodo:'PM', stock:6, stockMin:5, historial:{}},
        {id:'m3', nombre:'Atorvastatina', dosis:'20mg', cantidadTexto:'1 pastilla', hora:'09', minuto:'00', periodo:'PM', stock:24, stockMin:5, historial:{}}
      ],
      citas:[
        {id:'c1', tipo:'Médica', lugar:'Hospital Roosevelt', fecha: sumarDias(3), hora:'10:00 AM', notas:'Control de presión'},
        {id:'c2', tipo:'Dieta', lugar:'Revisión de plan alimenticio', fecha: sumarDias(8), hora:'02:30 PM', notas:''}
      ],
      animoLogs:[ {fecha:ayerISO(), animo:'Bien', sintomas:[]} ],
      alertas:[],
      fichaMedica:{tipoSangre:'O+', alergias:'Penicilina', diagnostico:'Hipertensión, diabetes tipo 2', notas:'Prefiere hablar despacio y de frente.'},
      documentos:[],
      directorio:[
        {id:'d1', nombre:'Farmacia del barrio', tipo:'Farmacia', telefono:'', zona:'A 5 min caminando'},
        {id:'d2', nombre:'Centro de salud', tipo:'Centro de salud', telefono:'', zona:'A 10 min en carro'}
      ]
    });
  },
  get(familyId){ return DB.get(this.clave(familyId), null); },
  set(familyId, datos){ DB.set(this.clave(familyId), datos); },
  actualizar(familyId, mutador){
    const datos = this.get(familyId);
    if(!datos) return;
    mutador(datos);
    this.set(familyId, datos);
  }
};
function sumarDias(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

/* ---------------- Sesión activa en este dispositivo/pestaña ---------------- */
const Sesion = {
  clave: 'cp_sesion',
  obtener(){ return DB.get(this.clave, null); },
  iniciar(rol, familyId){ DB.set(this.clave, {rol, familyId}); },
  cerrar(){ localStorage.removeItem(this.clave); CANAL.avisar(this.clave); },
};

/* ---------------- Preferencias visuales por rol (cada "celular" las suyas) ---------------- */
const Prefs = {
  clave(rol){ return 'cp_prefs_' + rol; },
  obtener(rol){ return DB.get(this.clave(rol), {tema:'quetzal', letra:'normal', contraste:'normal'}); },
  set(rol, cambios){
    const actuales = this.obtener(rol);
    Object.assign(actuales, cambios);
    DB.set(this.clave(rol), actuales);
    return actuales;
  }
};

const TEMAS = [
  {id:'quetzal', nombre:'Quetzal', colores:['#0E6E55','#E2932F','#F6F8F4']},
  {id:'cielo', nombre:'Cielo', colores:['#1B5E8A','#F0A93A','#F3F8FB']},
  {id:'atardecer', nombre:'Atardecer', colores:['#C1502E','#E8B94E','#FBF4EC']},
  {id:'bosque', nombre:'Bosque', colores:['#2F6B3A','#B5651D','#F5F7F0']},
  {id:'noche', nombre:'Noche', colores:['#4FA98A','#F0B84F','#171C1A']}
];

/* ---------------- Contenido estático de la biblioteca ---------------- */
const BIBLIOTECA = {
  alimentacion:[
    {titulo:'Comer bien no es lo mismo que comer mucho', texto:'Priorizar verduras, frutas, agua y porciones moderadas ayuda más que las cantidades grandes de comida.', icono:'i-apple'},
    {titulo:'Guía para hipertensión', texto:'Reducir la sal, evitar embutidos y preferir hierbas y limón para dar sabor a las comidas.', icono:'i-heart'},
    {titulo:'Guía para diabetes', texto:'Preferir carbohidratos integrales, comer a horarios fijos y evitar azúcares simples.', icono:'i-droplet'},
    {titulo:'Hidratación', texto:'Tomar agua durante el día, aunque no se sienta sed, es clave a esta edad.', icono:'i-info'}
  ],
  ejercicio:[
    {titulo:'Caminatas suaves', texto:'15 a 20 minutos de caminata diaria, en terreno plano y con buen calzado.', icono:'i-walk'},
    {titulo:'Estiramientos sentado', texto:'Movimientos suaves de brazos y piernas, ideales al despertar.', icono:'i-brain'},
    {titulo:'Equilibrio', texto:'Ejercicios simples de equilibrio, siempre cerca de una silla o pared de apoyo.', icono:'i-shield'}
  ],
  enfermedades:[
    {titulo:'Señales de alarma', texto:'Dolor de pecho, dificultad para respirar o hablar, o mareo repentino requieren ayuda inmediata.', icono:'i-alert'},
    {titulo:'Cuidado de la presión alta', texto:'Tomar la medicina a la misma hora todos los días y medir la presión regularmente.', icono:'i-heart'},
    {titulo:'Cuidado de la diabetes', texto:'Vigilar heridas en los pies y mantener control de la alimentación y el azúcar.', icono:'i-droplet'}
  ]
};
