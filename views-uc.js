/* ============================================================
   CUIDO+ — VISTAS DE LA CUENTA CUIDADOR (UC)
   ============================================================ */

VIEWS['uc/inicio'] = function(){
  const fam = familiaSesion(); if(!fam){ ir('#onb/bienvenida'); return ''; }
  const datos = datosSesion();
  const t = hoyISO();
  const medsHoy = datos.medicamentos.length;
  const medsTomados = datos.medicamentos.filter(m=>m.historial && m.historial[t]).length;
  const proximaCita = [...datos.citas].sort((a,b)=> a.fecha<b.fecha?-1:1)[0];
  const alertasVivas = datos.alertas.filter(a=>!a.atendida);

  const banner = alertasVivas.length ? `
    <div class="alerta-viva">
      ${icon('i-sos')}
      <div style="flex:1;">
        <div style="font-weight:800;">${fam.nombreAnciano} pidió ayuda</div>
        <div style="font-size:.8rem;opacity:.9;">${alertasVivas[0].fecha} · ${alertasVivas[0].hora}</div>
        <button class="btn btn-sm" onclick="atenderAlerta('${alertasVivas[0].id}')">Marcar como atendida</button>
      </div>
    </div>` : '';

  return `
    <div class="header-uc">
      <div class="perfil">
        <div class="avatar">${iniciales(fam.nombreCuidador)}</div>
        <div><div style="font-weight:800;">${fam.nombreCuidador}</div><div class="t-sub">Cuidando a ${fam.nombreAnciano}</div></div>
      </div>
      <button class="icon-btn" onclick="ir('#uc/ajustes')" aria-label="Ajustes">${icon('i-gear')}</button>
    </div>
    ${banner}
    <div class="stats-row">
      <div class="stat-box"><div class="num">${medsTomados}/${medsHoy}</div><div class="lbl">Medicinas hoy</div></div>
      <div class="stat-box"><div class="num">${proximaCita ? formatoFecha(proximaCita.fecha) : '--'}</div><div class="lbl">Próxima cita</div></div>
      <div class="stat-box"><div class="num">${datos.documentos.length}</div><div class="lbl">Documentos</div></div>
    </div>
    <div class="scroll-area">
      <div class="grid-modulos">
        <button class="btn-modulo" onclick="ir('#uc/historial')"><div class="icono-wrap">${icon('i-clipboard')}</div>Historial médico<span class="badge-count">Ficha y recetas</span></button>
        <button class="btn-modulo" onclick="ir('#uc/red-apoyo')"><div class="icono-wrap">${icon('i-shield')}</div>Red de apoyo<span class="badge-count">${alertasVivas.length} aviso(s)</span></button>
        <button class="btn-modulo" onclick="ir('#uc/salud')"><div class="icono-wrap">${icon('i-heart')}</div>Salud y ánimo<span class="badge-count">${datos.animoLogs.length} registros</span></button>
        <button class="btn-modulo" onclick="ir('#uc/reportes')"><div class="icono-wrap">${icon('i-print')}</div>Reportes<span class="badge-count">Exportar resumen</span></button>
      </div>
    </div>
    ${navUC('inicio')}
  `;
};
function atenderAlerta(id){
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{ const a = d.alertas.find(x=>x.id===id); if(a) a.atendida = true; });
  toast('Alerta marcada como atendida.');
  render();
}

/* ---------- Historial médico ---------- */
VIEWS['uc/historial'] = function(){
  const s = Sesion.obtener(); const datos = datosSesion(); const f = datos.fichaMedica;
  const editando = window._editarFicha;
  return `
    ${topbar('Historial médico', '#uc/inicio')}
    <div class="scroll-area">
      <div class="form-box">
        <div class="titulo-form">${icon('i-clipboard')} Ficha médica</div>
        ${editando ? `
          <div class="campo"><label>Tipo de sangre</label><input id="ff-sangre" value="${f.tipoSangre||''}"></div>
          <div class="campo"><label>Alergias</label><input id="ff-alergias" value="${f.alergias||''}"></div>
          <div class="campo"><label>Diagnóstico base</label><input id="ff-diag" value="${f.diagnostico||''}"></div>
          <div class="campo"><label>Notas para quien lo atienda</label><textarea id="ff-notas">${f.notas||''}</textarea></div>
          <div class="form-acciones">
            <button class="btn btn-ghost" onclick="window._editarFicha=false;render();">Cancelar</button>
            <button class="btn btn-brand" onclick="guardarFicha()">Guardar</button>
          </div>
        ` : `
          <div class="t-sub">${icon('i-droplet')} Tipo de sangre: <b>${f.tipoSangre||'No registrado'}</b></div>
          <div class="t-sub" style="margin-top:6px;">${icon('i-shield')} Alergias: <b>${f.alergias||'Ninguna registrada'}</b></div>
          <div class="t-sub" style="margin-top:6px;">Diagnóstico base: <b>${f.diagnostico||'No registrado'}</b></div>
          ${f.notas? `<div class="t-sub" style="margin-top:6px;">Notas: ${f.notas}</div>`:''}
          <button class="btn btn-ghost btn-sm" style="margin-top:12px;" onclick="window._editarFicha=true;render();">${icon('i-edit')} Editar ficha</button>
        `}
      </div>

      <div class="titulo-form" style="margin-bottom:10px;">${icon('i-folder')} Recetas y documentos</div>
      <div class="doc-grid">
        ${datos.documentos.map(d=>`
          <div class="doc-item">
            <img src="${d.dataUrl}" alt="${d.nombre}">
            <div class="doc-cap">${d.nombre}</div>
            <button class="doc-del" onclick="eliminarDoc('${d.id}')" aria-label="Eliminar">${icon('i-close')}</button>
          </div>
        `).join('')}
        <label class="doc-add">
          ${icon('i-camera')}<span>Agregar foto</span>
          <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="subirDoc(this)">
        </label>
      </div>
      <p style="color:var(--muted);font-size:.76rem;">Guarda fotos de recetas, resultados de laboratorio o diagnósticos para tenerlos siempre a la mano.</p>
    </div>
    ${navUC('inicio')}
  `;
};
function guardarFicha(){
  const s = Sesion.obtener();
  const cambios = {
    tipoSangre: document.getElementById('ff-sangre').value.trim(),
    alergias: document.getElementById('ff-alergias').value.trim(),
    diagnostico: document.getElementById('ff-diag').value.trim(),
    notas: document.getElementById('ff-notas').value.trim()
  };
  Datos.actualizar(s.familyId, d=>{ d.fichaMedica = cambios; });
  window._editarFicha = false;
  toast('Ficha médica actualizada.');
  render();
}
function subirDoc(input){
  const file = input.files[0]; if(!file) return;
  leerImagenComprimida(file, (dataUrl)=>{
    const s = Sesion.obtener();
    Datos.actualizar(s.familyId, d=>{
      d.documentos.unshift({id:uid('doc_'), nombre:'Documento '+new Date().toLocaleDateString('es-GT'), dataUrl});
    });
    toast('Documento guardado.');
    render();
  });
}
function eliminarDoc(id){
  modalConfirmar({titulo:'¿Eliminar documento?', texto:'Esta acción no se puede deshacer.', textoOk:'Eliminar', peligro:true, onOk:()=>{
    const s = Sesion.obtener();
    Datos.actualizar(s.familyId, d=>{ d.documentos = d.documentos.filter(x=>x.id!==id); });
    toast('Documento eliminado.');
    render();
  }});
}

/* ---------- Medicamentos ---------- */
VIEWS['uc/medicamentos'] = function(){
  const datos = datosSesion();
  const editId = window._editMedId;
  const items = datos.medicamentos.map(m => {
    const bajo = m.stock <= m.stockMin;
    return `
    <div class="tarjeta ${bajo?'dan':''}">
      <div class="fila-top">${icon('i-pill')}<span class="t-nombre">${m.nombre} ${m.dosis}</span></div>
      <div class="t-sub">${m.cantidadTexto} · ${m.hora}:${m.minuto} ${m.periodo}</div>
      <div class="t-sub">Existencias: <b>${m.stock}</b> ${bajo?'<span class="badge dan">Stock bajo</span>':''}</div>
      <div class="t-acciones">
        <button onclick="editarMed('${m.id}')">${icon('i-edit')} Editar</button>
        <button onclick="eliminarMed('${m.id}')">${icon('i-trash')} Eliminar</button>
      </div>
    </div>`;
  }).join('') || '<div class="vacio">'+icon('i-pill')+'<br>No hay medicamentos agregados.</div>';

  const form = window._mostrarFormMed ? formMedicamento(editId ? datos.medicamentos.find(m=>m.id===editId) : null) : `
    <button class="btn-secundario" onclick="window._mostrarFormMed=true; window._editMedId=null; render();">${icon('i-plus')} Añadir medicamento</button>
  `;

  return `
    ${topbar('Medicamentos', '#uc/inicio', 'Alarmas y control de existencias')}
    <div class="scroll-area">${items}${form}</div>
    ${navUC('medicamentos')}
  `;
};
function formMedicamento(m){
  return `
    <div class="form-box">
      <div class="campo"><label>Nombre</label><input id="f-nombre" value="${m? m.nombre:''}" placeholder="Ej. Ibuprofeno"></div>
      <div class="fila-2">
        <div class="campo"><label>Dosis</label><input id="f-dosis" value="${m? m.dosis:''}" placeholder="Ej. 400mg"></div>
        <div class="campo"><label>Cantidad</label><input id="f-cant" value="${m? m.cantidadTexto:''}" placeholder="Ej. 1 pastilla"></div>
      </div>
      <div class="fila-2">
        <div class="campo"><label>Hora</label><input id="f-hora" value="${m? m.hora:''}" placeholder="08" inputmode="numeric" maxlength="2"></div>
        <div class="campo"><label>Minuto</label><input id="f-minuto" value="${m? m.minuto:'00'}" placeholder="00" inputmode="numeric" maxlength="2"></div>
        <div class="campo"><label>AM/PM</label>
          <select id="f-periodo"><option ${m&&m.periodo==='AM'?'selected':''}>AM</option><option ${m&&m.periodo==='PM'?'selected':''}>PM</option></select>
        </div>
      </div>
      <div class="campo"><label>Existencias disponibles</label><input id="f-stock" value="${m? m.stock:'10'}" inputmode="numeric"></div>
      <div class="form-acciones">
        <button class="btn btn-ghost" onclick="window._mostrarFormMed=false; render();">Cancelar</button>
        <button class="btn btn-brand" onclick="guardarMed('${m? m.id:''}')">Guardar</button>
      </div>
    </div>
  `;
}
function editarMed(id){ window._mostrarFormMed=true; window._editMedId=id; render(); }
function eliminarMed(id){
  modalConfirmar({titulo:'¿Eliminar medicamento?', texto:'Ya no aparecerá en la app del adulto mayor.', textoOk:'Eliminar', peligro:true, onOk:()=>{
    const s = Sesion.obtener();
    Datos.actualizar(s.familyId, d=>{ d.medicamentos = d.medicamentos.filter(m=>m.id!==id); });
    toast('Medicamento eliminado.');
    render();
  }});
}
function guardarMed(id){
  const nombre = document.getElementById('f-nombre').value.trim();
  const dosis = document.getElementById('f-dosis').value.trim();
  const cant = document.getElementById('f-cant').value.trim() || '1 pastilla';
  const hora = document.getElementById('f-hora').value.trim().padStart(2,'0');
  const minuto = document.getElementById('f-minuto').value.trim().padStart(2,'0') || '00';
  const periodo = document.getElementById('f-periodo').value;
  const stock = parseInt(document.getElementById('f-stock').value,10) || 0;
  if(!nombre || !hora){ toast('Completa al menos nombre y hora.'); return; }
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{
    if(id){
      const m = d.medicamentos.find(x=>x.id===id);
      Object.assign(m, {nombre, dosis, cantidadTexto:cant, hora, minuto, periodo, stock});
    }else{
      d.medicamentos.push({id:uid('m_'), nombre, dosis, cantidadTexto:cant, hora, minuto, periodo, stock, stockMin:5, historial:{}});
    }
  });
  window._mostrarFormMed = false; window._editMedId = null;
  toast('Medicamento guardado.');
  render();
}

/* ---------- Agenda (citas y dietas) ---------- */
VIEWS['uc/agenda'] = function(){
  const datos = datosSesion();
  const citas = [...datos.citas].sort((a,b)=> a.fecha<b.fecha?-1:1);
  const items = citas.map(c => `
    <div class="tarjeta acc">
      <div class="fila-top">${icon('i-calendar')}<span class="t-nombre">${c.lugar}</span></div>
      <div class="t-sub">${c.tipo} · ${formatoFecha(c.fecha)} · ${c.hora}</div>
      ${c.notas? `<div class="t-sub">${c.notas}</div>`:''}
      <div class="t-acciones"><button onclick="eliminarCita('${c.id}')">${icon('i-trash')} Eliminar</button></div>
    </div>
  `).join('') || '<div class="vacio">'+icon('i-calendar')+'<br>Sin citas registradas.</div>';

  const form = window._mostrarFormCita ? formCita() : `
    <button class="btn-secundario" onclick="window._mostrarFormCita=true; render();">${icon('i-plus')} Añadir cita o recordatorio</button>
  `;
  return `
    ${topbar('Agenda', '#uc/inicio', 'Citas médicas y dietas')}
    <div class="scroll-area">${items}${form}</div>
    ${navUC('agenda')}
  `;
};
function formCita(){
  return `
    <div class="form-box">
      <div class="campo"><label>Tipo</label>
        <select id="fc-tipo"><option>Médica</option><option>Dieta</option><option>Terapia</option><option>Otro</option></select>
      </div>
      <div class="campo"><label>Lugar o motivo</label><input id="fc-lugar" placeholder="Ej. Hospital Roosevelt"></div>
      <div class="fila-2">
        <div class="campo"><label>Fecha</label><input id="fc-fecha" type="date"></div>
        <div class="campo"><label>Hora</label><input id="fc-hora" placeholder="10:00 AM"></div>
      </div>
      <div class="campo"><label>Notas (opcional)</label><textarea id="fc-notas" placeholder="Ej. Llevar exámenes anteriores"></textarea></div>
      <div class="form-acciones">
        <button class="btn btn-ghost" onclick="window._mostrarFormCita=false; render();">Cancelar</button>
        <button class="btn btn-brand" onclick="guardarCita()">Guardar</button>
      </div>
    </div>
  `;
}
function guardarCita(){
  const tipo = document.getElementById('fc-tipo').value;
  const lugar = document.getElementById('fc-lugar').value.trim();
  const fecha = document.getElementById('fc-fecha').value || hoyISO();
  const hora = document.getElementById('fc-hora').value.trim() || '09:00 AM';
  const notas = document.getElementById('fc-notas').value.trim();
  if(!lugar){ toast('Escribe el lugar o motivo.'); return; }
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{ d.citas.push({id:uid('c_'), tipo, lugar, fecha, hora, notas}); });
  window._mostrarFormCita = false;
  toast('Cita agregada a la agenda.');
  render();
}
function eliminarCita(id){
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{ d.citas = d.citas.filter(c=>c.id!==id); });
  toast('Cita eliminada.');
  render();
}

/* ---------- Biblioteca ---------- */
VIEWS['uc/biblioteca'] = function(){
  const tab = window._tabBib || 'alimentacion';
  const tabs = [['alimentacion','Alimentación'],['ejercicio','Actividad física'],['enfermedades','Enfermedades']];
  const guias = BIBLIOTECA[tab].map(g=>`
    <div class="guia-card"><div class="icono-wrap">${icon(g.icono)}</div><div><h4>${g.titulo}</h4><p>${g.texto}</p></div></div>
  `).join('');
  return `
    ${topbar('Biblioteca', '#uc/inicio', 'Guías para compartir con la familia')}
    <div class="tabs">${tabs.map(([id,lbl])=>`<button class="tab ${tab===id?'on':''}" onclick="window._tabBib='${id}';render();">${lbl}</button>`).join('')}</div>
    <div class="scroll-area">${guias}</div>
    ${navUC('biblioteca')}
  `;
};

/* ---------- Red de apoyo (alertas + directorio) ---------- */
VIEWS['uc/red-apoyo'] = function(){
  const fam = familiaSesion(); const datos = datosSesion();
  const alertas = [...datos.alertas].sort((a,b)=> b.fecha+b.hora < a.fecha+a.hora ? -1:1).slice(0,12);
  const alertasHtml = alertas.map(a=>`
    <div class="tarjeta dan">
      <div class="fila-top">${icon('i-sos')}<span class="t-nombre">Aviso de emergencia</span> ${a.atendida?'<span class="badge ok">Atendida</span>':'<span class="badge dan">Nueva</span>'}</div>
      <div class="t-sub">${a.fecha} · ${a.hora}</div>
      ${!a.atendida? `<div class="t-acciones"><button onclick="atenderAlerta('${a.id}')">${icon('i-check')} Marcar atendida</button></div>`:''}
    </div>
  `).join('') || '<div class="vacio">'+icon('i-shield')+'<br>Sin avisos de emergencia por ahora.</div>';

  const dirForm = window._mostrarFormDir ? formDirectorio() : `<button class="btn-secundario" onclick="window._mostrarFormDir=true;render();">${icon('i-plus')} Agregar a mi directorio</button>`;
  const dir = datos.directorio.map(d=>`
    <div class="dir-item">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="icono-wrap">${icon('i-map')}</div>
        <div><div style="font-weight:800;">${d.nombre}</div><div class="t-sub">${d.tipo} · ${d.zona}</div></div>
      </div>
      ${d.telefono? `<a class="call" href="tel:${d.telefono}" aria-label="Llamar">${icon('i-phone')}</a>` : ''}
    </div>
  `).join('');

  return `
    ${topbar('Red de apoyo', '#uc/inicio')}
    <div class="scroll-area">
      <div class="subtitulo">Avisos de ${fam.nombreAnciano}</div>
      ${alertasHtml}
      <div class="subtitulo" style="margin-top:18px;">Directorio de ayuda cercana</div>
      ${dir}
      ${dirForm}
    </div>
    ${navUC('inicio')}
  `;
};
function formDirectorio(){
  return `
    <div class="form-box">
      <div class="campo"><label>Nombre</label><input id="fd-nombre" placeholder="Ej. Farmacia San Martín"></div>
      <div class="fila-2">
        <div class="campo"><label>Tipo</label><input id="fd-tipo" placeholder="Farmacia, clínica..."></div>
        <div class="campo"><label>Referencia / zona</label><input id="fd-zona" placeholder="A 5 min caminando"></div>
      </div>
      <div class="campo"><label>Teléfono (opcional)</label><input id="fd-tel" placeholder="Ej. 2222-3333"></div>
      <div class="form-acciones">
        <button class="btn btn-ghost" onclick="window._mostrarFormDir=false;render();">Cancelar</button>
        <button class="btn btn-brand" onclick="guardarDirectorio()">Guardar</button>
      </div>
    </div>
  `;
}
function guardarDirectorio(){
  const nombre = document.getElementById('fd-nombre').value.trim();
  const tipo = document.getElementById('fd-tipo').value.trim() || 'Centro de ayuda';
  const zona = document.getElementById('fd-zona').value.trim();
  const telefono = document.getElementById('fd-tel').value.trim();
  if(!nombre){ toast('Escribe un nombre.'); return; }
  const s = Sesion.obtener();
  Datos.actualizar(s.familyId, d=>{ d.directorio.push({id:uid('d_'), nombre, tipo, zona, telefono}); });
  window._mostrarFormDir = false;
  toast('Agregado al directorio.');
  render();
}

/* ---------- Salud y ánimo ---------- */
VIEWS['uc/salud'] = function(){
  const datos = datosSesion();
  const logs = [...datos.animoLogs].sort((a,b)=> a.fecha<b.fecha?1:-1);
  const totalMeds = datos.medicamentos.length;
  const items = logs.map(l=>{
    const tomadas = datos.medicamentos.filter(m=>m.historial && m.historial[l.fecha]).length;
    const sint = l.sintomas && l.sintomas.length ? ' · Molestias: '+l.sintomas.join(', ') : '';
    return `<div class="tarjeta dan">
      <div class="t-nombre">${formatoFecha(l.fecha)}</div>
      <div class="t-sub">Ánimo: ${l.animo} · Medicinas: ${tomadas}/${totalMeds} tomadas${sint}</div>
    </div>`;
  }).join('') || '<div class="vacio">'+icon('i-heart')+'<br>Aún no hay registros de salud.</div>';
  return `
    ${topbar('Salud y ánimo', '#uc/inicio', 'Lo que reporta el adulto mayor')}
    <div class="scroll-area">${items}</div>
    ${navUC('inicio')}
  `;
};

/* ---------- Reportes ---------- */
VIEWS['uc/reportes'] = function(){
  const fam = familiaSesion(); const datos = datosSesion();
  return `
    ${topbar('Reportes', '#uc/inicio')}
    <div class="scroll-area">
      <div class="tarjeta">
        <div class="t-nombre">Resumen para imprimir o guardar en PDF</div>
        <div class="t-sub">Incluye ficha médica, medicamentos y últimas citas. Usa la opción "Guardar como PDF" de tu navegador al imprimir.</div>
      </div>
      <button class="btn btn-brand btn-block" onclick="window.print()">${icon('i-print')} Imprimir / Guardar como PDF</button>
    </div>
    ${navUC('inicio')}

    <div id="print-area" style="display:none;">
      <h2>Reporte de ${fam.nombreAnciano}</h2>
      <p>Cuidador: ${fam.nombreCuidador} · Generado: ${new Date().toLocaleDateString('es-GT')}</p>
      <h3>Ficha médica</h3>
      <p>Tipo de sangre: ${datos.fichaMedica.tipoSangre||'--'}<br>Alergias: ${datos.fichaMedica.alergias||'--'}<br>Diagnóstico: ${datos.fichaMedica.diagnostico||'--'}</p>
      <h3>Medicamentos</h3>
      <ul>${datos.medicamentos.map(m=>`<li>${m.nombre} ${m.dosis} — ${m.cantidadTexto} a las ${m.hora}:${m.minuto} ${m.periodo}</li>`).join('')}</ul>
      <h3>Próximas citas</h3>
      <ul>${datos.citas.map(c=>`<li>${c.lugar} — ${formatoFecha(c.fecha)} ${c.hora}</li>`).join('')}</ul>
    </div>
  `;
};

/* ---------- Ajustes ---------- */
VIEWS['uc/ajustes'] = function(){
  const fam = familiaSesion();
  const prefs = Prefs.obtener('uc');
  return `
    ${topbar('Ajustes', '#uc/inicio')}
    <div class="scroll-area">
      <div class="tarjeta-vinculo">
        <div class="tv-label">Código de vínculo</div>
        <div class="tv-codigo">${fam.codigo}</div>
        <div class="tv-linea"></div>
        <div class="tv-nombres"><span>${fam.nombreCuidador}</span><span>${fam.nombreAnciano}</span></div>
      </div>
      <p style="color:var(--muted);font-size:.78rem;margin-bottom:20px;">Comparte este código para vincular el celular de ${fam.nombreAnciano} con esta cuenta.</p>

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
        <div class="txt">${icon('i-info')}<div><h4>Alto contraste</h4><p>Fondo negro, letras grandes</p></div></div>
        <button class="switch ${prefs.contraste==='alto'?'on':''}" onclick="cambiarPref({contraste:'${prefs.contraste==='alto'?'normal':'alto'}'})"></button>
      </div>

      <button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="cerrarSesion()">${icon('i-logout')} Cerrar sesión</button>
    </div>
    ${navUC('ajustes')}
  `;
};
