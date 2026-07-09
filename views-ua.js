/* ============================================================
   CUIDO+ — VISTAS DE LA CUENTA ADULTO MAYOR (UA)
   Menos texto, íconos grandes, botones amplios.
   ============================================================ */

VIEWS['ua/inicio'] = function(){
  const fam = familiaSesion(); if(!fam){ ir('#onb/bienvenida'); return ''; }
  const d = new Date();
  const hora = d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
  const fecha = d.toLocaleDateString('es-GT', {weekday:'long', day:'numeric', month:'long'});
  return `
    <div class="reloj">
      <div class="saludo" style="text-align:left;">Hola, ${fam.nombreAnciano.split(' ')[0]}</div>
      <div class="hora">${hora}</div>
      <div class="fecha">${fecha}</div>
    </div>
    <div class="scroll-area">
      <button class="boton-grande" onclick="ir('#ua/medicinas')">
        <div class="icono-wrap">${icon('i-pill')}</div>
        <div><div>Mis medicinas</div><div class="sub">Ver y marcar como tomadas</div></div>
      </button>
      <button class="boton-grande" onclick="ir('#ua/citas')">
        <div class="icono-wrap acc">${icon('i-calendar')}</div>
        <div><div>Mis citas</div><div class="sub">Consultas y recordatorios</div></div>
      </button>
      <button class="boton-grande" onclick="ir('#ua/animo')">
        <div class="icono-wrap acc">${icon('i-heart')}</div>
        <div><div>¿Cómo me siento?</div><div class="sub">Contarle a mi cuidador</div></div>
      </button>
      <button class="boton-grande" onclick="ir('#ua/sos')">
        <div class="icono-wrap dan">${icon('i-sos')}</div>
        <div><div>Pedir ayuda</div><div class="sub">Avisar a ${fam.nombreCuidador.split(' ')[0]} ahora</div></div>
      </button>
    </div>
    ${navUA('inicio')}
  `;
};

VIEWS['ua/medicinas'] = function(){
  const datos = datosSesion();
  const t = hoyISO();
  const items = datos.medicamentos.map(m => {
    const tomada = m.historial && m.historial[t];
    return `
    <div class="item-medicina ${tomada?'tomada':''}">
      <div class="izq">
        <div class="icono-wrap">${icon('i-pill')}</div>
        <div><div class="nombre-med">${m.nombre}</div><div class="hora-med">${m.hora}:${m.minuto} ${m.periodo} · ${m.cantidadTexto}</div></div>
      </div>
      <button class="check-tomada ${tomada?'hecha':''}" onclick="marcarTomadaDesdeLista('${m.id}')" aria-label="Marcar tomada">${icon('i-check')}</button>
    </div>`;
  }).join('') || '<div class="vacio">'+icon('i-pill')+'<br>Tu cuidador aún no ha agregado medicinas.</div>';
  return `
    ${topbar('Mis medicinas', '#ua/inicio')}
    <div class="scroll-area">${items}
      ${datos.medicamentos.length ? `<div class="center" style="margin-top:6px;"><button class="link-text" onclick="probarAlarma()">Ver cómo avisa una alarma</button></div>` : ''}
    </div>
    ${navUA('medicinas')}
  `;
};
function probarAlarma(){
  const datos = datosSesion();
  const t = hoyISO();
  const pendiente = datos.medicamentos.find(m=>!(m.historial && m.historial[t])) || datos.medicamentos[0];
  window._alarmaActual = pendiente.id;
  ir('#ua/alarma');
}
function marcarTomadaDesdeLista(id){
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{
    const m = d.medicamentos.find(x=>x.id===id);
    if(m){ m.historial = m.historial||{}; const t = hoyISO(); m.historial[t] = !m.historial[t]; if(m.historial[t] && m.stock>0) m.stock--; }
  });
  render();
}

VIEWS['ua/citas'] = function(){
  const datos = datosSesion();
  const citas = [...datos.citas].filter(c=>c.fecha>=hoyISO()).sort((a,b)=> a.fecha<b.fecha?-1:1);
  const items = citas.map(c => `
    <div class="tarjeta acc">
      <div class="fila-top">${icon('i-calendar')}<span class="t-nombre">${c.lugar}</span></div>
      <div class="t-sub">${formatoFecha(c.fecha)} · ${c.hora}</div>
    </div>
  `).join('') || '<div class="vacio">'+icon('i-calendar')+'<br>No tienes citas próximas.</div>';
  return `
    ${topbar('Mis citas', '#ua/inicio')}
    <div class="scroll-area">${items}</div>
    ${navUA('citas')}
  `;
};

VIEWS['ua/animo'] = function(){
  return `
    ${topbar('¿Cómo me siento?', '#ua/inicio')}
    <div class="scroll-area">
      <div class="subtitulo">Hoy me siento:</div>
      <div class="grid2" id="grid-animo">
        <button class="btn-sel animo" data-v="Bien" onclick="selUnico(this)">${icon('i-mood-bien')}Bien</button>
        <button class="btn-sel animo" data-v="Triste" onclick="selUnico(this)">${icon('i-mood-triste')}Triste</button>
        <button class="btn-sel animo" data-v="Enojado" onclick="selUnico(this)">${icon('i-mood-enojado')}Enojado</button>
        <button class="btn-sel animo" data-v="Estresado" onclick="selUnico(this)">${icon('i-mood-estres')}Estresado</button>
      </div>
      <div class="subtitulo">¿Algo te duele? (puedes marcar varios)</div>
      <div class="grid2" id="grid-salud">
        <button class="btn-sel salud" data-v="Mareo" onclick="selMulti(this)">${icon('i-sy-mareo')}Mareo</button>
        <button class="btn-sel salud" data-v="Presión" onclick="selMulti(this)">${icon('i-sy-presion')}Presión</button>
        <button class="btn-sel salud" data-v="Cabeza" onclick="selMulti(this)">${icon('i-sy-cabeza')}Cabeza</button>
        <button class="btn-sel salud" data-v="Náuseas" onclick="selMulti(this)">${icon('i-sy-nausea')}Náuseas</button>
        <button class="btn-sel salud" data-v="Fiebre" onclick="selMulti(this)">${icon('i-sy-fiebre')}Fiebre</button>
      </div>
    </div>
    <button class="btn-primario" onclick="enviarAnimo()">Enviar a mi cuidador</button>
  `;
};
function selUnico(btn){ document.querySelectorAll('.animo').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
function selMulti(btn){ btn.classList.toggle('on'); }
function enviarAnimo(){
  const animoBtn = document.querySelector('.animo.on');
  const sintomas = Array.from(document.querySelectorAll('.salud.on')).map(b=>b.dataset.v);
  if(!animoBtn){ toast('Elige cómo te sientes.'); return; }
  const s = Sesion.obtener();
  const t = hoyISO();
  Datos.actualizar(s.familyId, d=>{
    const idx = d.animoLogs.findIndex(l=>l.fecha===t);
    const entrada = {fecha:t, animo:animoBtn.dataset.v, sintomas};
    if(idx>=0) d.animoLogs[idx]=entrada; else d.animoLogs.push(entrada);
  });
  toast('Enviado. Tu cuidador lo verá.');
  setTimeout(()=>ir('#ua/inicio'), 900);
}

VIEWS['ua/sos'] = function(){
  const fam = familiaSesion();
  return `
    ${topbar('Pedir ayuda', '#ua/inicio')}
    <div class="scroll-area" style="text-align:center;padding-top:10px;">
      <div class="sos-circulo">${icon('i-sos')}</div>
      <p style="font-size:1.05rem;font-weight:700;margin-bottom:6px;">¿Enviar aviso de emergencia a ${fam.nombreCuidador}?</p>
      <p style="color:var(--muted);font-size:.85rem;margin-bottom:22px;">Le llegará de inmediato a su celular.</p>
    </div>
    <button class="btn btn-danger btn-block" onclick="enviarSOS()">${icon('i-sos')} Sí, enviar aviso</button>
    <button class="btn-secundario" onclick="ir('#ua/inicio')">Cancelar</button>
    ${fam.telefono ? `<a class="btn btn-ghost btn-block" style="margin-top:10px;" href="tel:${fam.telefono}">${icon('i-phone')} Llamar directo</a>` : ''}
  `;
};
function enviarSOS(){
  const s = Sesion.obtener();
  const now = new Date();
  Datos.actualizar(s.familyId, d=>{
    d.alertas.unshift({id:uid('a_'), tipo:'Emergencia', atendida:false,
      hora: now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0'), fecha: hoyISO()});
  });
  toast('Aviso enviado a tu cuidador.');
  ir('#ua/inicio');
}

VIEWS['ua/alarma'] = function(){
  const datos = datosSesion();
  const t = hoyISO();
  const pendiente = datos.medicamentos.find(m => m.id === window._alarmaActual) || datos.medicamentos.find(m => !(m.historial && m.historial[t]));
  if(!pendiente){
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <div style="font-size:3rem;">🎉</div>
        <p style="font-size:1.1rem;font-weight:700;margin-top:10px;">Ya tomaste todas tus medicinas de hoy.</p>
        <button class="btn btn-brand" style="margin-top:24px;" onclick="ir('#ua/inicio')">Volver al inicio</button>
      </div>`;
  }
  return `
    <div class="vista-alarma">
      <div class="alarma-titulo">Es hora de tu medicina</div>
      <div class="alarma-hora">${pendiente.hora}:${pendiente.minuto} ${pendiente.periodo}</div>
      <div class="alarma-caja">
        <div class="alarma-nombre">${pendiente.nombre}</div>
        <div class="alarma-cant">${pendiente.cantidadTexto}</div>
      </div>
      <button class="boton-tomada" onclick="marcarTomadaAlarma('${pendiente.id}')">Ya la tomé</button>
      <button class="boton-posponer" onclick="posponerAlarma()">Recordarme en 5 minutos</button>
    </div>
  `;
};
function marcarTomadaAlarma(id){
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{
    const m = d.medicamentos.find(x=>x.id===id);
    if(m){ m.historial = m.historial||{}; m.historial[hoyISO()] = true; if(m.stock>0) m.stock--; }
  });
  toast('¡Registrado! Buen trabajo.');
  ir('#ua/inicio');
}
function posponerAlarma(){
  toast('Te lo recordamos en 5 minutos.');
  ir('#ua/inicio');
}

VIEWS['ua/biblioteca'] = function(){
  const tab = window._tabBibUA || 'alimentacion';
  const tabs = [['alimentacion','Comida'],['ejercicio','Ejercicio'],['enfermedades','Salud']];
  const guias = BIBLIOTECA[tab].map(g=>`
    <div class="guia-card"><div class="icono-wrap">${icon(g.icono)}</div><div><h4>${g.titulo}</h4><p>${g.texto}</p></div></div>
  `).join('');
  return `
    ${topbar('Guías para mí', '#ua/inicio')}
    <div class="tabs">${tabs.map(([id,lbl])=>`<button class="tab ${tab===id?'on':''}" onclick="window._tabBibUA='${id}';render();">${lbl}</button>`).join('')}</div>
    <div class="scroll-area">${guias}</div>
    ${navUA('biblioteca')}
  `;
};

VIEWS['ua/ajustes'] = function(){
  const fam = familiaSesion();
  const prefs = Prefs.obtener('ua');
  return `
    ${topbar('Ajustes', '#ua/inicio')}
    <div class="scroll-area">
      <div class="subtitulo">${icon('i-palette')} Color de la app</div>
      <div class="temas-grid">
        ${TEMAS.map(t=>`
          <button class="tema-op ${prefs.tema===t.id?'on':''}" onclick="cambiarPref({tema:'${t.id}'})">
            <div class="tema-swatch">${t.colores.map(c=>`<span style="background:${c}"></span>`).join('')}</div>
            <span class="tema-nombre">${t.nombre}</span>
          </button>
        `).join('')}
      </div>
      <div class="opcion-fila">
        <div class="txt">${icon('i-text')}<div><h4>Tamaño de letra</h4></div></div>
        <div class="segmentado">
          <button class="${prefs.letra==='normal'?'on':''}" onclick="cambiarPref({letra:'normal'})">A</button>
          <button class="${prefs.letra==='grande'?'on':''}" onclick="cambiarPref({letra:'grande'})">A+</button>
          <button class="${prefs.letra==='muy-grande'?'on':''}" onclick="cambiarPref({letra:'muy-grande'})">A++</button>
        </div>
      </div>
      <div class="opcion-fila">
        <div class="txt">${icon('i-info')}<div><h4>Alto contraste</h4><p>Más fácil de leer</p></div></div>
        <button class="switch ${prefs.contraste==='alto'?'on':''}" onclick="cambiarPref({contraste:'${prefs.contraste==='alto'?'normal':'alto'}'})"></button>
      </div>
      <div class="tarjeta" style="margin-top:6px;">
        <div class="t-sub">Vinculado con: <b>${fam.nombreCuidador}</b></div>
      </div>
      <button class="btn btn-outline btn-block" style="margin-top:14px;" onclick="cerrarSesion()">${icon('i-logout')} Cerrar sesión</button>
    </div>
    ${navUA('ajustes')}
  `;
};
