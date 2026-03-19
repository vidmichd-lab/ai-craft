"use strict";exports.id=183,exports.ids=[183],exports.modules={8183:(a,b,c)=>{c.r(b),c.d(b,{showSizesAdmin:()=>A});var d=c(6867),e=c(7326),f=c(3590),g=c(2729),h=c(7390),i=c(5107);c(8813);var j=c(7082),k=c(8712),l=c(7072),m=c(2968),n=c(2304),o=c(7627),p=c(6879),q=c(8976),r=c(7704);let s=null,t=!1,u=!1,v=null,w=(a=[],b=8)=>{if(!a||0===a.length)return"";if(a.length<=b)return a.join(", ");let c=a.slice(0,b),d=a.length-c.length;return`${c.join(", ")} и ещё ${d}`},x=a=>{let b={vertical:[],ultraWide:[],veryWide:[],horizontal:[],square:[],tall:[]},c=Object.keys(b).reduce((a,b)=>(a[b]=new Set,a),{}),e=(a,d)=>{a&&d&&b[a]&&(c[a].has(d)||(c[a].add(d),b[a].push(d)))},f=(a,b,c)=>{let d=((a,b,c)=>{let d=Number(a),e=Number(b);if(!Number.isFinite(d)||!Number.isFinite(e))return null;let f=c?` (${c})`:"";return`${Math.round(d)}\xd7${Math.round(e)}${f}`})(a,b,c);if(!d)return;let f=Number(a),g=Number(b);if(g>=f*m.r.VERTICAL_THRESHOLD){e("vertical",d),g/f>=2&&e("tall",d);return}return f>=g*m.r.ULTRA_WIDE_THRESHOLD?void e("ultraWide",d):f>=4*g?void e("veryWide",d):f>=g*m.r.HORIZONTAL_THRESHOLD?void e("horizontal",d):void e("square",d)};return Object.entries((a?.presetSizes&&Object.keys(a.presetSizes).length>0?a.presetSizes:(0,d.Sb)())||{}).forEach(([a,b=[]])=>{b.forEach(b=>f(b.width,b.height,a))}),(a?.customSizes||[]).forEach((a,b)=>{let c=a.name||a.label||`Custom ${b+1}`;f(a.width,a.height,c)}),b},y=()=>{try{let a=(0,f.getState)(),b=document.documentElement,c=getComputedStyle(b),d=c.getPropertyValue("--border-color")||"#2a2a2a",e=c.getPropertyValue("--bg-primary")||"#0d0d0d",g=c.getPropertyValue("--text-primary")||"#e9e9e9",h=c.getPropertyValue("--text-secondary")||"#999999",i=a.formatMultipliers||{vertical:{logo:2,title:1,subtitle:1,legal:1,age:1},ultraWide:{logo:.75,titleSmall:3,titleMedium:2.2,titleLarge:2,subtitleSmall:3,subtitleMedium:2.2,subtitleLarge:2,legalNormal:2.5,legalMedium:2,age:2},veryWide:{logo:.75,titleMedium:2.2,titleLarge:2,titleExtraLarge:2,subtitleMedium:2.2,subtitleLarge:2,subtitleExtraLarge:2,legalNormal:2.5,legalMedium:2,legalExtraLarge:2.5,age:2},horizontal:{logo:.75,titleSmall:1.8,titleLarge:1.6,titleWideSmall:1.2,titleWideMedium:1.4,subtitleSmall:1.8,subtitleLarge:1.6,subtitleWideSmall:1.2,subtitleWideMedium:1.4,legalSmall:1.8,legalLarge:2,legalWide450:1.2,legalWide500:1.1,legalWideOther:1.15,age:2,ageWide:null},square:{title:.9,subtitle:.9},tall:{title:1.3,subtitle:1.3}},j=(a,b)=>{let c=parseInt(a.slice(1,3),16),d=parseInt(a.slice(3,5),16),e=parseInt(a.slice(5,7),16);return`rgba(${c}, ${d}, ${e}, ${b})`},k="#FF9800",l="#2196F3",m="#9C27B0",n="#4CAF50",o="#AA96DA",p="#FF6B6B",q="#4ECDC4",r="#95E1D3",s="#F38181",t=x(a),u=(a,b=15)=>{let c=w(t[a],b);return c?`<div class="format-type-hint" style="font-size: 10px; color: ${h}; margin-top: 6px; line-height: 1.4; padding: 6px 8px; background: rgba(255, 255, 255, 0.03); border-radius: 4px; font-family: 'Courier New', monospace;">${c}</div>`:""},v=(a,b=10)=>{let c=w(t[a],b);return c?`<div class="format-type-hint" style="font-size: 10px; color: ${h}; margin: 4px 0; line-height: 1.4; padding: 4px 6px; background: rgba(255, 255, 255, 0.03); border-radius: 4px; font-family: 'Courier New', monospace;">${c}</div>`:""};return`
    <div style="display: flex; flex-direction: column; gap: 20px; width: 100%; min-width: 0;">
      <div style="padding: 14px; background: rgba(33, 150, 243, 0.12); border-left: 4px solid #2196F3; border-radius: 6px; margin-bottom: 4px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">zoom_in</span>
          <div>
            <div style="font-weight: 600; color: ${g}; margin-bottom: 4px; font-size: 14px;">Множители форматов</div>
            <div style="font-size: 12px; color: ${h}; line-height: 1.5;">Множители применяются к размерам элементов в зависимости от типа формата. Схожие элементы выделены одинаковыми цветами для удобства навигации.</div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${j(k,.08)}; border: 1px solid ${j(k,.4)}; border-left: 4px solid ${k}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${j(k,.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${j(k,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${k}; font-size: 22px;">crop_portrait</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${g};">Вертикальные форматы</h3>
            <div style="font-size: 11px; color: ${h}; margin-top: 2px;">height >= width \xd7 1.5 (вертикальные баннеры)</div>
            ${u("vertical")}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group" style="border-left: 3px solid ${o}; padding-left: 10px; background: ${j(o,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${o};"></span>
              Логотип
            </label>
            <input type="number" id="multiplier-vertical-logo" value="${i.vertical.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${p}; padding-left: 10px; background: ${j(p,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p};"></span>
              Заголовок
            </label>
            <input type="number" id="multiplier-vertical-title" value="${i.vertical.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${q}; padding-left: 10px; background: ${j(q,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${q};"></span>
              Подзаголовок
            </label>
            <input type="number" id="multiplier-vertical-subtitle" value="${i.vertical.subtitle??1}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${r}; padding-left: 10px; background: ${j(r,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r};"></span>
              Юридический текст
            </label>
            <input type="number" id="multiplier-vertical-legal" value="${i.vertical.legal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${s}; padding-left: 10px; background: ${j(s,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${s};"></span>
              Возраст
            </label>
            <input type="number" id="multiplier-vertical-age" value="${i.vertical.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${j(l,.08)}; border: 1px solid ${j(l,.4)}; border-left: 4px solid ${l}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${j(l,.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${j(l,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${l}; font-size: 22px;">crop_landscape</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${g};">Ультра-широкие форматы</h3>
            <div style="font-size: 11px; color: ${h}; margin-top: 2px;">width >= height \xd7 8 (очень широкие баннеры)</div>
            ${u("ultraWide")}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group" style="border-left: 3px solid ${o}; padding-left: 10px; background: ${j(o,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${o};"></span>
              Логотип
            </label>
            <input type="number" id="multiplier-ultraWide-logo" value="${i.ultraWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${p}; padding-left: 10px; background: ${j(p,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p};"></span>
              Заголовок (height < 120)
            </label>
            <input type="number" id="multiplier-ultraWide-titleSmall" value="${i.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${q}; padding-left: 10px; background: ${j(q,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${q};"></span>
              Подзаголовок (height < 120)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleSmall" value="${i.ultraWide.subtitleSmall??i.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${p}; padding-left: 10px; background: ${j(p,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p};"></span>
              Заголовок (height < 200)
            </label>
            <input type="number" id="multiplier-ultraWide-titleMedium" value="${i.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${q}; padding-left: 10px; background: ${j(q,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${q};"></span>
              Подзаголовок (height < 200)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleMedium" value="${i.ultraWide.subtitleMedium??i.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${p}; padding-left: 10px; background: ${j(p,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${p};"></span>
              Заголовок (height >= 200)
            </label>
            <input type="number" id="multiplier-ultraWide-titleLarge" value="${i.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${q}; padding-left: 10px; background: ${j(q,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${q};"></span>
              Подзаголовок (height >= 200)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleLarge" value="${i.ultraWide.subtitleLarge??i.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${r}; padding-left: 10px; background: ${j(r,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r};"></span>
              Юридический (обычный)
            </label>
            <input type="number" id="multiplier-ultraWide-legalNormal" value="${i.ultraWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${r}; padding-left: 10px; background: ${j(r,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${r};"></span>
              Юридический (height 250-350)
            </label>
            <input type="number" id="multiplier-ultraWide-legalMedium" value="${i.ultraWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${s}; padding-left: 10px; background: ${j(s,.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${s};"></span>
              Возраст
            </label>
            <input type="number" id="multiplier-ultraWide-age" value="${i.ultraWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${j(m,.08)}; border: 1px solid ${j(m,.4)}; border-left: 4px solid ${m}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${j(m,.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${j(m,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${m}; font-size: 22px;">crop_landscape</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${g};">Очень широкие форматы</h3>
            <div style="font-size: 11px; color: ${h}; margin-top: 2px;">width >= height \xd7 4 (широкие баннеры)</div>
            ${u("veryWide")}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-veryWide-logo" value="${i.veryWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-veryWide-titleMedium" value="${i.veryWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-veryWide-subtitleMedium" value="${i.veryWide.subtitleMedium??i.veryWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-veryWide-titleLarge" value="${i.veryWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-veryWide-subtitleLarge" value="${i.veryWide.subtitleLarge??i.veryWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-titleExtraLarge" value="${i.veryWide.titleExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-subtitleExtraLarge" value="${i.veryWide.subtitleExtraLarge??i.veryWide.titleExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (обычный)</label>
            <input type="number" id="multiplier-veryWide-legalNormal" value="${i.veryWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-veryWide-legalMedium" value="${i.veryWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-legalExtraLarge" value="${i.veryWide.legalExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-veryWide-age" value="${i.veryWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${j(n,.08)}; border: 1px solid ${j(n,.4)}; border-left: 4px solid ${n}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${j(n,.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${j(n,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${n}; font-size: 22px;">crop_landscape</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${g};">Горизонтальные форматы</h3>
            <div style="font-size: 11px; color: ${h}; margin-top: 2px;">width >= height \xd7 1.5 (горизонтальные баннеры)</div>
            ${u("horizontal")}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-horizontal-logo" value="${i.horizontal.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-horizontal-titleSmall" value="${i.horizontal.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-horizontal-subtitleSmall" value="${i.horizontal.subtitleSmall??i.horizontal.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-horizontal-titleLarge" value="${i.horizontal.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-horizontal-subtitleLarge" value="${i.horizontal.subtitleLarge??i.horizontal.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (широкий, height >= 800)</label>
            <input type="number" id="multiplier-horizontal-titleWideSmall" value="${i.horizontal.titleWideSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (широкий, height >= 800)</label>
            <input type="number" id="multiplier-horizontal-subtitleWideSmall" value="${i.horizontal.subtitleWideSmall??i.horizontal.titleWideSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (широкий, height 500-800)</label>
            <input type="number" id="multiplier-horizontal-titleWideMedium" value="${i.horizontal.titleWideMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (широкий, height 500-800)</label>
            <input type="number" id="multiplier-horizontal-subtitleWideMedium" value="${i.horizontal.subtitleWideMedium??i.horizontal.titleWideMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-horizontal-legalSmall" value="${i.horizontal.legalSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height > 350)</label>
            <input type="number" id="multiplier-horizontal-legalLarge" value="${i.horizontal.legalLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, height 450-500)</label>
            <input type="number" id="multiplier-horizontal-legalWide450" value="${i.horizontal.legalWide450}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, height 500-1080)</label>
            <input type="number" id="multiplier-horizontal-legalWide500" value="${i.horizontal.legalWide500}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, другое)</label>
            <input type="number" id="multiplier-horizontal-legalWideOther" value="${i.horizontal.legalWideOther}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-horizontal-age" value="${i.horizontal.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid ${j(d,.4)}; border-left: 4px solid ${d}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${d};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${h}; font-size: 22px;">tune</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${g};">Дополнительные настройки</h3>
            <div style="font-size: 11px; color: ${h}; margin-top: 2px;">Специальные форматы</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Квадратные форматы: Заголовок</label>
            ${v("square")}
            <input type="number" id="multiplier-square-title" value="${i.square.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Квадратные форматы: Подзаголовок</label>
            ${v("square")}
            <input type="number" id="multiplier-square-subtitle" value="${i.square.subtitle??i.square.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Высокие макеты (height/width >= 2): Заголовок</label>
            ${v("tall")}
            <input type="number" id="multiplier-tall-title" value="${i.tall.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Высокие макеты (height/width >= 2): Подзаголовок</label>
            ${v("tall")}
            <input type="number" id="multiplier-tall-subtitle" value="${i.tall.subtitle??i.tall.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${d}; border-radius: 6px; background: ${e}; color: ${g}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; color: ${g}; font-size: 13px;">
        <strong>💡 Подсказка:</strong> Изменения применяются автоматически при изменении значений. Множители влияют на размеры элементов в зависимости от типа формата.
      </div>
    </div>
  `}catch(a){return console.error("Ошибка при рендеринге вкладки множителей:",a),`<div style="padding: 20px; color: red;">Ошибка при загрузке множителей: ${a.message}</div>`}},z=()=>{(0,f.getState)();let a=getComputedStyle(document.documentElement).getPropertyValue("--border-color")||"#2a2a2a",b=getComputedStyle(document.documentElement).getPropertyValue("--bg-primary")||"#0d0d0d",c=getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9",d=getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999",e=JSON.parse(localStorage.getItem("adminBackgrounds")||"[]");return`
    <div style="padding: 14px; background: rgba(33, 150, 243, 0.12); border-left: 4px solid #2196F3; border-radius: 6px; margin-bottom: 20px;">
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">palette</span>
        <div>
          <div style="font-weight: 600; color: ${c}; margin-bottom: 4px; font-size: 14px;">Управление фонами</div>
          <div style="font-size: 12px; color: ${d}; line-height: 1.5;">Настройте фоны, цвета текста и логотипы для каждого фона. При выборе фона автоматически применяются соответствующие настройки текста и логотипа.</div>
        </div>
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <button class="btn btn-primary" id="adminAddBackground" style="display: flex; align-items: center; gap: 6px;">
        <span class="material-icons" style="font-size: 18px;">add</span>
        Добавить фон
      </button>
    </div>
    
    <div id="adminBackgroundsList" style="display: flex; flex-direction: column; gap: 16px;">
      ${e.map((e,f)=>`
        <div class="admin-background-item" data-bg-index="${f}" style="border: 1px solid ${a}; border-radius: 8px; padding: 16px; background: ${b};">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 60px; height: 60px; border-radius: 8px; background: ${e.bgColor||"#1e1e1e"}; border: 1px solid ${a}; position: relative; overflow: hidden;">
                ${e.bgImage?`<img src="${e.bgImage}" style="width: 100%; height: 100%; object-fit: cover;">`:""}
              </div>
              <div>
                <div style="font-weight: 600; color: ${c}; margin-bottom: 4px;">Фон #${f+1}</div>
                <div style="font-size: 12px; color: ${d};">
                  ${e.bgImage?"Изображение":`Цвет: ${e.bgColor||"#1e1e1e"}`}
                </div>
              </div>
            </div>
            <button class="btn btn-danger" data-remove-bg="${f}" style="padding: 8px;">
              <span class="material-icons" style="font-size: 18px;">delete</span>
            </button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Фон</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="color" class="admin-bg-color" data-bg-index="${f}" value="${e.bgColor||"#1e1e1e"}" style="width: 60px; height: 40px; border: 1px solid ${a}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-bg-color-hex" data-bg-index="${f}" value="${e.bgColor||"#1e1e1e"}" placeholder="#1e1e1e" style="flex: 1; padding: 8px; border: 1px solid ${a}; border-radius: 8px; background: ${b}; color: ${c}; font-family: inherit; font-size: 14px;">
              </div>
              <button class="btn" data-upload-bg="${f}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>
                Загрузить изображение
              </button>
              <input type="file" class="admin-bg-upload-file" data-bg-index="${f}" accept="image/*" style="display: none;">
              <button class="btn" data-select-bg="${f}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">image</span>
                Выбрать из библиотеки
              </button>
              ${e.bgImage?`<button class="btn btn-danger" data-clear-bg="${f}" style="width: 100%;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">delete</span>
                Удалить изображение
              </button>`:""}
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Цвет текста</label>
              <div style="display: flex; gap: 8px;">
                <input type="color" class="admin-text-color" data-bg-index="${f}" value="${e.textColor||"#ffffff"}" style="width: 60px; height: 40px; border: 1px solid ${a}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-text-color-hex" data-bg-index="${f}" value="${e.textColor||"#ffffff"}" placeholder="#ffffff" style="flex: 1; padding: 8px; border: 1px solid ${a}; border-radius: 8px; background: ${b}; color: ${c}; font-family: inherit; font-size: 14px;">
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Логотип</label>
              <select class="admin-logo-folder" data-bg-index="${f}" style="width: 100%; padding: 8px; border: 1px solid ${a}; border-radius: 8px; background: ${b}; color: ${c}; font-family: inherit; font-size: 14px;">
                <option value="white" ${"white"===e.logoFolder?"selected":""}>Белый</option>
                <option value="black" ${"black"===e.logoFolder||!e.logoFolder?"selected":""}>Черный</option>
              </select>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `},A=async()=>{let a=(0,r.gC)()?(0,r.Al)()?(0,r.Yr)()?{enforced:!0,allowed:!0}:(alert("Эта панель доступна только роли lead или admin в текущей команде."),{enforced:!0,allowed:!1}):(alert("Войдите в workspace с ролью lead или admin, чтобы управлять командными defaults."),{enforced:!0,allowed:!1}):{enforced:!1,allowed:!1};if(a.enforced){if(!a.allowed)return;await C();return}console.log("showSizesAdmin вызвана"),console.log("isAdminOpen:",t),console.log("adminModal:",s),console.log("isAdminAuthenticated (до сброса):",u),console.log("hasPassword():",(0,o.cw)());let b=document.getElementById("sizesAdminModal");if(b){let a=window.getComputedStyle(b);if("none"!==a.display&&"hidden"!==a.visibility&&parseFloat(a.opacity)>0){D(),setTimeout(()=>{A()},100);return}}if(u=!1,!(0,o.cw)()){console.log("Пароль не установлен, открываем без пароля"),u=!0,await C().catch(a=>console.error("Ошибка при открытии админки:",a));return}if(u){console.log("Уже аутентифицирован, открываем админку"),await C().catch(a=>console.error("Ошибка при открытии админки:",a));return}console.log("Показываем окно ввода пароля"),B()},B=()=>{let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",c=a.getPropertyValue("--bg-secondary")||"#141414",d=a.getPropertyValue("--border-color")||"#2a2a2a",e=a.getPropertyValue("--text-primary")||"#e9e9e9",f=a.getPropertyValue("--text-secondary")||"#999999",g=document.getElementById("adminPasswordPrompt");g&&g.remove();let h=document.createElement("div");h.id="adminPasswordPrompt",h.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  `,h.innerHTML=`
    <div style="background: ${c}; border: 1px solid ${d}; border-radius: 12px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <span class="material-icons" style="font-size: 28px; color: #2196F3;">lock</span>
        <h2 style="margin: 0; font-size: 20px; color: ${e};">Вход в админку</h2>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">Пароль</label>
        <input type="password" id="adminPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="Введите пароль" autofocus>
        <div id="adminPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Неверный пароль</div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="adminPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${d}; border-radius: 8px; color: ${e}; cursor: pointer;">Отмена</button>
        <button id="adminPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">Войти</button>
      </div>
    </div>
  `,document.body.appendChild(h);let i=h.querySelector("#adminPasswordInput"),j=h.querySelector("#adminPasswordError"),k=h.querySelector("#adminPasswordSubmit"),l=h.querySelector("#adminPasswordCancel"),m=()=>{let a=i.value;(0,o.O7)(a)?(u=!0,h.remove(),C().catch(a=>console.error("Ошибка при открытии админки:",a))):(j.style.display="block",i.style.borderColor="#f44336",i.value="",i.focus())};k.addEventListener("click",m),l.addEventListener("click",()=>{h.remove()}),i.addEventListener("keydown",a=>{"Enter"===a.key?m():"Escape"===a.key&&h.remove()}),h.addEventListener("click",a=>{a.target===h&&h.remove()}),setTimeout(()=>{i.focus()},100)},C=async()=>{console.log("openSizesAdmin вызвана"),t=!0;let a=(0,d.Sb)();if(!a["РСЯ"]){console.log("Размеры неполные, загружаем из файла...");try{a=await (0,d.tj)(),console.log("Размеры перезагружены из файла:",a)}catch(a){console.warn("Не удалось перезагрузить размеры, используем текущие:",a)}}console.log("Размеры для админки:",a),console.log("Платформы:",Object.keys(a));let b=getComputedStyle(document.documentElement),c=b.getPropertyValue("--bg-primary")||"#0d0d0d",g=b.getPropertyValue("--bg-secondary")||"#141414",h=b.getPropertyValue("--border-color")||"#2a2a2a",i=b.getPropertyValue("--text-primary")||"#e9e9e9",j=b.getPropertyValue("--text-secondary")||"#999999",k=document.getElementById("sizesAdminModal");if(k&&(console.log("Удаляем существующее модальное окно из DOM перед созданием нового"),k._escapeHandler&&document.removeEventListener("keydown",k._escapeHandler),k.parentNode&&k.parentNode.removeChild(k)),s&&(!s.parentNode||null===s.parentNode)&&(console.log("Сбрасываем переменную adminModal, так как элемент не в DOM"),s=null),s&&!document.body.contains(s)&&(console.log("adminModal существует, но не в DOM, создаем новый"),s=null),s&&document.body.contains(s))return void console.log("adminModal уже в DOM, не создаем новый");(s=document.createElement("div")).id="sizesAdminModal",s.className="sizes-admin-modal",s.style.cssText=`
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 99999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
  `,s.innerHTML=`
    <div class="sizes-admin-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); z-index: 1;"></div>
    <div class="sizes-admin-content" style="position: relative; background: ${g}; border: 1px solid ${h}; border-radius: 12px; width: 95%; max-width: 1400px; height: 95vh; max-height: 95vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); z-index: 2; overflow: hidden;">
      <!-- Заголовок -->
      <div class="sizes-admin-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid ${h}; display: flex; align-items: center; justify-content: space-between; background: ${c};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="material-icons" style="font-size: 24px; color: ${i};">settings</span>
          <div>
            <h2 style="margin: 0; font-size: 20px; color: ${i};">Админка</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${j}; opacity: 0.8;">Управление форматами и значениями по умолчанию</p>
          </div>
        </div>
        <button class="sizes-admin-close" id="sizesAdminClose" style="padding: 8px 16px; background: transparent; border: 1px solid ${h}; border-radius: 8px; color: ${i}; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <span class="material-icons" style="font-size: 20px;">close</span>
          <span>Закрыть</span>
        </button>
      </div>
      
      <!-- Основной контент с аккордеоном -->
      <div class="sizes-admin-body" style="flex: 1; overflow-y: auto; padding: 20px; min-height: 0;">
        <!-- Раздел: Размеры -->
        <div class="admin-accordion-section" data-section="sizes" style="margin-bottom: 16px; border: 1px solid ${h}; border-radius: 8px; background: ${c}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${g};" data-accordion-toggle="sizes">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${i};">aspect_ratio</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${i};">Размеры</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${i}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionSizes" style="padding: 20px; display: none;">
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="material-icons" style="font-size: 18px; color: #2196F3;">info</span>
                <span style="font-weight: 500; color: ${i};">Размеры автоматически группируются по типу формата</span>
              </div>
              <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: ${j};">
                <span style="display: flex; align-items: center; gap: 4px;"><span style="color: #4CAF50;">■</span> Квадратные</span>
                <span style="display: flex; align-items: center; gap: 4px;"><span style="color: #2196F3;">■</span> Горизонтальные</span>
                <span style="display: flex; align-items: center; gap: 4px;"><span style="color: #FF9800;">■</span> Вертикальные</span>
              </div>
            </div>
            <div class="sizes-admin-toolbar" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
              <button class="btn btn-primary" id="sizesAdminAddPlatform" title="Добавить новую платформу для размеров">
                <span class="material-icons">add</span> Добавить платформу
              </button>
              <button class="btn" id="sizesAdminExport" title="Экспортировать настройки размеров в JSON файл">
                <span class="material-icons">download</span> Экспорт JSON
              </button>
              <button class="btn" id="sizesAdminImport" title="Импортировать настройки размеров из JSON файла">
                <span class="material-icons">upload</span> Импорт JSON
              </button>
              <input type="file" id="sizesAdminImportFile" accept=".json" style="display: none;">
              <button class="btn btn-danger" id="sizesAdminReset" title="Сбросить все размеры к значениям по умолчанию">
                <span class="material-icons">refresh</span> Сбросить к дефолту
              </button>
            </div>
            <div class="sizes-admin-platforms" id="sizesAdminPlatforms"></div>
          </div>
        </div>
        
        <!-- Раздел: Значения -->
        <div class="admin-accordion-section" data-section="values" style="margin-bottom: 16px; border: 1px solid ${h}; border-radius: 8px; background: ${c}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${g};" data-accordion-toggle="values">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${i};">tune</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${i};">Значения</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${i}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionValues" style="padding: 20px; display: none;">
            ${(()=>{let a=localStorage.getItem((0,e.N5)("default-values")),b=a?JSON.parse(a):null;getComputedStyle(document.documentElement).getPropertyValue("--border-color"),getComputedStyle(document.documentElement).getPropertyValue("--bg-primary"),getComputedStyle(document.documentElement).getPropertyValue("--text-primary"),getComputedStyle(document.documentElement).getPropertyValue("--text-secondary"),v||(v=JSON.parse(JSON.stringify((0,f.getDefaultValues)())));let c=(0,f.getDefaultValues)(),d=b||c;b?.logoSelected&&(b.logoSelected,v.logoSelected),b?.kvSelected&&(b.kvSelected,v.kvSelected);let g=(a,b)=>{let c=parseInt(a.slice(1,3),16),d=parseInt(a.slice(3,5),16),e=parseInt(a.slice(5,7),16);return`rgba(${c}, ${d}, ${e}, ${b})`},h="#FF6B6B",i="#4ECDC4",j="#95E1D3",k="#F38181",m="#FFD93D";return`
    <div class="form-group" style="display: flex; flex-direction: column; gap: var(--spacing-xl);">
      <div class="admin-info-box">
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
          <span class="material-icons" style="font-size: var(--font-size-lg); color: #2196F3; flex-shrink: 0; margin-top: 2px;">info</span>
          <div>
            <div style="font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--spacing-xs); font-size: var(--font-size-md);">${(0,p.t)("admin.sizes.defaults.title")}</div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;">${(0,p.t)("admin.sizes.defaults.desc")}</div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${(0,p.t)("admin.sizes.defaults.titleLabel")}</label>
        <textarea id="defaultTitle" class="theme-input" style="min-height: 60px;">${d.title||""}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${(0,p.t)("admin.sizes.defaults.subtitleLabel")}</label>
        <textarea id="defaultSubtitle" class="theme-input" style="min-height: 60px;">${d.subtitle||""}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${(0,p.t)("admin.sizes.defaults.legalLabel")}</label>
        <textarea id="defaultLegal" class="theme-input" style="min-height: 80px;">${d.legal||""}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${(0,p.t)("admin.sizes.defaults.ageLabel")}</label>
        <input type="text" id="defaultAge" class="theme-input" value="${d.age||"18+"}">
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${(0,p.t)("admin.sizes.defaults.bgLabel")}</label>
        <div id="defaultBgPreview" class="preview-container" style="background: ${d.bgColor||"#1e1e1e"};">
          <img id="defaultBgPreviewImg" src="${d.bgImage||""}" class="preview-img" style="display: ${d.bgImage?"block":"none"}; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
          <span id="defaultBgPreviewPlaceholder" class="preview-placeholder" style="z-index: 1;">${d.bgImage?(0,p.t)("admin.sizes.defaults.bgImage"):(0,p.t)("admin.sizes.defaults.bgColor")+(d.bgColor||"#1e1e1e")}</span>
        </div>
        <div class="input-group" style="margin-bottom: var(--spacing-sm);">
          <input type="color" id="defaultBgColor" value="${d.bgColor||"#1e1e1e"}" style="flex: 0 0 60px;">
          <input type="text" id="defaultBgColorHex" class="theme-input" value="${d.bgColor||"#1e1e1e"}" placeholder="#1e1e1e">
          <button class="btn btn-danger" id="defaultBgColorReset" style="display: ${d.bgColor!==v.bgColor?"block":"none"};" title="${(0,p.t)("admin.sizes.defaults.bgReset")}"><span class="material-icons">refresh</span></button>
        </div>
        <button class="btn btn-full" id="defaultBgUpload"><span class="material-icons">upload</span>${(0,p.t)("admin.sizes.defaults.bgUpload")}</button>
        <input type="file" id="defaultBgUploadFile" accept="image/*" style="display: none;">
        <button class="btn btn-danger btn-full" id="defaultBgClear" style="margin-top: var(--spacing-sm); display: ${d.bgImage?"block":"none"};"><span class="material-icons">delete</span>${(0,p.t)("admin.sizes.defaults.bgDelete")}</button>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${(0,p.t)("admin.sizes.defaults.titleColorLabel")}</label>
        <div class="input-group">
          <input type="color" id="defaultTextColor" value="${d.titleColor||"#ffffff"}" style="flex: 0 0 60px;">
          <input type="text" id="defaultTextColorHex" class="theme-input" value="${d.titleColor||"#ffffff"}" placeholder="#ffffff">
          <button class="btn btn-danger" id="defaultTextColorReset" style="display: ${d.titleColor!==v.titleColor?"block":"none"};" title="${(0,p.t)("admin.sizes.defaults.bgReset")}"><span class="material-icons">refresh</span></button>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${h}; background: ${g(h,.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${g(h,.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${g(h,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${h}; font-size: var(--font-size-lg);">title</span>
          </div>
          <div>
            <h3 class="admin-section-title">${(0,p.t)("admin.sizes.titleSettings.title")}</h3>
            <div class="hint" style="margin-top: 2px;">${(0,p.t)("admin.sizes.titleSettings.desc")}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.size")}</label>
            <input type="number" id="defaultTitleSize" class="theme-input" value="${d.titleSize??c.titleSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.weight")}</label>
            <select id="defaultTitleWeight" class="theme-input">
              <option value="Thin" ${"Thin"===d.titleWeight?"selected":""}>Thin</option>
              <option value="ExtraLight" ${"ExtraLight"===d.titleWeight?"selected":""}>ExtraLight</option>
              <option value="Light" ${"Light"===d.titleWeight?"selected":""}>Light</option>
              <option value="Regular" ${"Regular"===d.titleWeight||!d.titleWeight?"selected":""}>Regular</option>
              <option value="Medium" ${"Medium"===d.titleWeight?"selected":""}>Medium</option>
              <option value="SemiBold" ${"SemiBold"===d.titleWeight?"selected":""}>SemiBold</option>
              <option value="Bold" ${"Bold"===d.titleWeight?"selected":""}>Bold</option>
              <option value="Heavy" ${"Heavy"===d.titleWeight?"selected":""}>Heavy</option>
              <option value="Black" ${"Black"===d.titleWeight?"selected":""}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.align")}</label>
            <select id="defaultTitleAlign" class="theme-input">
              <option value="left" ${"left"===d.titleAlign||!d.titleAlign?"selected":""}>${(0,p.t)("admin.sizes.titleSettings.align.left")}</option>
              <option value="center" ${"center"===d.titleAlign?"selected":""}>${(0,p.t)("admin.sizes.titleSettings.align.center")}</option>
              <option value="right" ${"right"===d.titleAlign?"selected":""}>${(0,p.t)("admin.sizes.titleSettings.align.right")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.vPos")}</label>
            <select id="defaultTitleVPos" class="theme-input">
              <option value="top" ${"top"===d.titleVPos||!d.titleVPos?"selected":""}>${(0,p.t)("admin.sizes.titleSettings.vPos.top")}</option>
              <option value="center" ${"center"===d.titleVPos?"selected":""}>${(0,p.t)("admin.sizes.titleSettings.vPos.center")}</option>
              <option value="bottom" ${"bottom"===d.titleVPos?"selected":""}>${(0,p.t)("admin.sizes.titleSettings.vPos.bottom")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.letterSpacing")}</label>
            <input type="number" id="defaultTitleLetterSpacing" class="theme-input" value="${d.titleLetterSpacing??0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.lineHeight")}</label>
            <input type="number" id="defaultTitleLineHeight" class="theme-input" value="${d.titleLineHeight??1.1}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${i}; background: ${g(i,.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${g(i,.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${g(i,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${i}; font-size: var(--font-size-lg);">subtitles</span>
          </div>
          <div>
            <h3 class="admin-section-title">${(0,p.t)("admin.sizes.subtitleSettings.title")}</h3>
            <div class="hint" style="margin-top: 2px;">${(0,p.t)("admin.sizes.subtitleSettings.desc")}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.color")}</label>
            <div class="input-group">
              <input type="color" id="defaultSubtitleColor" value="${d.subtitleColor||"#e0e0e0"}" style="flex: 0 0 60px;">
              <input type="text" id="defaultSubtitleColorHex" class="theme-input" value="${d.subtitleColor||"#e0e0e0"}" placeholder="#e0e0e0">
            </div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.opacity")}</label>
            <input type="number" id="defaultSubtitleOpacity" class="theme-input" value="${d.subtitleOpacity??c.subtitleOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.size")}</label>
            <input type="number" id="defaultSubtitleSize" class="theme-input" value="${d.subtitleSize??c.subtitleSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.ratio")}</label>
            <input type="range" id="defaultTitleSubtitleRatio" value="${d.titleSubtitleRatio??c.titleSubtitleRatio}" step="0.01" min="0.1" max="1">
            <div class="slider-value">
              <span>0.1</span>
              <span id="defaultTitleSubtitleRatioValue">${(d.titleSubtitleRatio??c.titleSubtitleRatio).toFixed(2)}</span>
              <span>1.0</span>
            </div>
            <div class="hint">${(0,p.t)("admin.sizes.subtitleSettings.ratioHint")}</div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.weight")}</label>
            <select id="defaultSubtitleWeight" class="theme-input">
              <option value="Thin" ${"Thin"===d.subtitleWeight?"selected":""}>Thin</option>
              <option value="ExtraLight" ${"ExtraLight"===d.subtitleWeight?"selected":""}>ExtraLight</option>
              <option value="Light" ${"Light"===d.subtitleWeight?"selected":""}>Light</option>
              <option value="Regular" ${"Regular"===d.subtitleWeight||!d.subtitleWeight?"selected":""}>Regular</option>
              <option value="Medium" ${"Medium"===d.subtitleWeight?"selected":""}>Medium</option>
              <option value="SemiBold" ${"SemiBold"===d.subtitleWeight?"selected":""}>SemiBold</option>
              <option value="Bold" ${"Bold"===d.subtitleWeight?"selected":""}>Bold</option>
              <option value="Heavy" ${"Heavy"===d.subtitleWeight?"selected":""}>Heavy</option>
              <option value="Black" ${"Black"===d.subtitleWeight?"selected":""}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.align")}</label>
            <select id="defaultSubtitleAlign" class="theme-input">
              <option value="left" ${"left"===d.subtitleAlign||!d.subtitleAlign?"selected":""}>${(0,p.t)("admin.sizes.subtitleSettings.align.left")}</option>
              <option value="center" ${"center"===d.subtitleAlign?"selected":""}>${(0,p.t)("admin.sizes.subtitleSettings.align.center")}</option>
              <option value="right" ${"right"===d.subtitleAlign?"selected":""}>${(0,p.t)("admin.sizes.subtitleSettings.align.right")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.gap")}</label>
            <input type="number" id="defaultSubtitleGap" class="theme-input" value="${d.subtitleGap??c.subtitleGap}" step="0.1" min="-10" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.letterSpacing")}</label>
            <input type="number" id="defaultSubtitleLetterSpacing" class="theme-input" value="${d.subtitleLetterSpacing??0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.lineHeight")}</label>
            <input type="number" id="defaultSubtitleLineHeight" class="theme-input" value="${d.subtitleLineHeight??1.2}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${j}; background: ${g(j,.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${g(j,.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${g(j,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${j}; font-size: var(--font-size-lg);">gavel</span>
          </div>
          <div>
            <h3 class="admin-section-title">${(0,p.t)("admin.sizes.legalSettings.title")}</h3>
            <div class="hint" style="margin-top: 2px;">${(0,p.t)("admin.sizes.legalSettings.desc")}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.color")}</label>
            <div class="input-group">
              <input type="color" id="defaultLegalColor" value="${d.legalColor||"#ffffff"}" style="flex: 0 0 60px;">
              <input type="text" id="defaultLegalColorHex" class="theme-input" value="${d.legalColor||"#ffffff"}" placeholder="#ffffff">
            </div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.subtitleSettings.opacity")}</label>
            <input type="number" id="defaultLegalOpacity" class="theme-input" value="${d.legalOpacity??c.legalOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.size")}</label>
            <input type="number" id="defaultLegalSize" class="theme-input" value="${d.legalSize??c.legalSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.weight")}</label>
            <select id="defaultLegalWeight" class="theme-input">
              <option value="Thin" ${"Thin"===d.legalWeight?"selected":""}>Thin</option>
              <option value="ExtraLight" ${"ExtraLight"===d.legalWeight?"selected":""}>ExtraLight</option>
              <option value="Light" ${"Light"===d.legalWeight?"selected":""}>Light</option>
              <option value="Regular" ${"Regular"===d.legalWeight||!d.legalWeight?"selected":""}>Regular</option>
              <option value="Medium" ${"Medium"===d.legalWeight?"selected":""}>Medium</option>
              <option value="SemiBold" ${"SemiBold"===d.legalWeight?"selected":""}>SemiBold</option>
              <option value="Bold" ${"Bold"===d.legalWeight?"selected":""}>Bold</option>
              <option value="Heavy" ${"Heavy"===d.legalWeight?"selected":""}>Heavy</option>
              <option value="Black" ${"Black"===d.legalWeight?"selected":""}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.legalSettings.align")}</label>
            <select id="defaultLegalAlign" class="theme-input">
              <option value="left" ${"left"===d.legalAlign||!d.legalAlign?"selected":""}>${(0,p.t)("admin.sizes.legalSettings.align.left")}</option>
              <option value="center" ${"center"===d.legalAlign?"selected":""}>${(0,p.t)("admin.sizes.legalSettings.align.center")}</option>
              <option value="right" ${"right"===d.legalAlign?"selected":""}>${(0,p.t)("admin.sizes.legalSettings.align.right")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.letterSpacing")}</label>
            <input type="number" id="defaultLegalLetterSpacing" class="theme-input" value="${d.legalLetterSpacing??0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.lineHeight")}</label>
            <input type="number" id="defaultLegalLineHeight" class="theme-input" value="${d.legalLineHeight??1.4}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${k}; background: ${g(k,.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${g(k,.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${g(k,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${k}; font-size: var(--font-size-lg);">child_care</span>
          </div>
          <div>
            <h3 class="admin-section-title">${(0,p.t)("admin.sizes.ageSettings.title")}</h3>
            <div class="hint" style="margin-top: 2px;">${(0,p.t)("admin.sizes.ageSettings.desc")}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.size")}</label>
            <input type="number" id="defaultAgeSize" class="theme-input" value="${d.ageSize??c.ageSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.titleSettings.weight")}</label>
            <select id="defaultAgeWeight" class="theme-input">
              <option value="Thin" ${"Thin"===d.ageWeight?"selected":""}>Thin</option>
              <option value="ExtraLight" ${"ExtraLight"===d.ageWeight?"selected":""}>ExtraLight</option>
              <option value="Light" ${"Light"===d.ageWeight?"selected":""}>Light</option>
              <option value="Regular" ${"Regular"===d.ageWeight||!d.ageWeight?"selected":""}>Regular</option>
              <option value="Medium" ${"Medium"===d.ageWeight?"selected":""}>Medium</option>
              <option value="SemiBold" ${"SemiBold"===d.ageWeight?"selected":""}>SemiBold</option>
              <option value="Bold" ${"Bold"===d.ageWeight?"selected":""}>Bold</option>
              <option value="Heavy" ${"Heavy"===d.ageWeight?"selected":""}>Heavy</option>
              <option value="Black" ${"Black"===d.ageWeight?"selected":""}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.ageSettings.gap")}</label>
            <input type="number" id="defaultAgeGapPercent" class="theme-input" value="${d.ageGapPercent??c.ageGapPercent}" step="0.1" min="0" max="10">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${m}; background: ${g(m,.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${g(m,.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${g(m,.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${m}; font-size: var(--font-size-lg);">settings</span>
          </div>
          <div>
            <h3 class="admin-section-title">${(0,p.t)("admin.sizes.advancedSettings.title")}</h3>
            <div class="hint" style="margin-top: 2px;">${(0,p.t)("admin.sizes.advancedSettings.desc")}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.padding")}</label>
            <input type="number" id="defaultPaddingPercent" class="theme-input" value="${d.paddingPercent??c.paddingPercent}" step="0.1" min="0" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.layoutMode")}</label>
            <select id="defaultLayoutMode" class="theme-input">
              <option value="auto" ${"auto"===d.layoutMode||!d.layoutMode?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.layoutMode.auto")}</option>
              <option value="horizontal" ${"horizontal"===d.layoutMode?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.layoutMode.horizontal")}</option>
              <option value="vertical" ${"vertical"===d.layoutMode?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.layoutMode.vertical")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.bgHPos")}</label>
            <select id="defaultBgPosition" class="theme-input">
              <option value="left" ${"left"===d.bgPosition?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgHPos.left")}</option>
              <option value="center" ${"center"===d.bgPosition||!d.bgPosition?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgHPos.center")}</option>
              <option value="right" ${"right"===d.bgPosition?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgHPos.right")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.bgVPos")}</label>
            <select id="defaultBgVPosition" class="theme-input">
              <option value="top" ${"top"===d.bgVPosition?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgVPos.top")}</option>
              <option value="center" ${"center"===d.bgVPosition||!d.bgVPosition?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgVPos.center")}</option>
              <option value="bottom" ${"bottom"===d.bgVPosition?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgVPos.bottom")}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.bgSize")}</label>
            <select id="defaultBgSize" class="theme-input">
              <option value="cover" ${"cover"===d.bgSize||!d.bgSize?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgSize.cover")}</option>
              <option value="contain" ${"contain"===d.bgSize?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgSize.contain")}</option>
              <option value="fill" ${"fill"===d.bgSize?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgSize.fill")}</option>
              <option value="tile" ${"tile"===d.bgSize?"selected":""}>${(0,p.t)("admin.sizes.advancedSettings.bgSize.tile")}</option>
            </select>
          </div>
          <div class="form-group" id="bgImageSizeGroup" style="display: ${"tile"===d.bgSize||"cover"===d.bgSize||"contain"===d.bgSize?"block":"none"};">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.bgImageSize")}</label>
            <input type="range" id="defaultBgImageSize" class="theme-input" value="${d.bgImageSize??100}" step="1" min="10" max="500" style="width: 100%;">
            <div class="slider-value" style="display: flex; justify-content: center; margin-top: 4px;">
              <span id="defaultBgImageSizeValue">${d.bgImageSize??100}%</span>
            </div>
            <div class="hint">${(0,p.t)("admin.sizes.advancedSettings.bgImageSizeHint")}</div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.textGradientOpacity")}</label>
            <input type="number" id="defaultTextGradientOpacity" class="theme-input" value="${d.textGradientOpacity??c.textGradientOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.centerTextOverlayOpacity")}</label>
            <input type="number" id="defaultCenterTextOverlayOpacity" class="theme-input" value="${d.centerTextOverlayOpacity??20}" step="1" min="0" max="100">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.advancedSettings.defaultFont")}</label>
            <select id="defaultFontFamily" class="theme-input">
              ${l.HV.map(a=>{let b=(("system-ui"===d.fontFamily?"YS Text":d.fontFamily)||"YS Text")===a.family?"selected":"";return`<option value="${a.family}" ${b}>${a.name||a.family}</option>`}).join("")}
            </select>
            <div class="hint">${(0,p.t)("admin.sizes.advancedSettings.defaultFontHint")}</div>
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: #4ECDC4; background: ${g("#4ECDC4",.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${g("#4ECDC4",.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${g("#4ECDC4",.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: #4ECDC4; font-size: var(--font-size-lg);">download</span>
          </div>
          <div>
            <h3 class="admin-section-title">${(0,p.t)("admin.sizes.exportSettings.title")}</h3>
            <div class="hint" style="margin-top: 2px;">${(0,p.t)("admin.sizes.exportSettings.desc")}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.exportSettings.maxFileSize")}</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="defaultMaxFileSizeValue" class="theme-input" value="${d.maxFileSizeValue??150}" step="0.1" min="0.1" max="100" style="flex: 1;">
              <select id="defaultMaxFileSizeUnit" class="theme-input" style="flex: 0 0 120px;">
                <option value="KB" ${"KB"===(d.maxFileSizeUnit||"KB")?"selected":""}>${(0,p.t)("admin.sizes.exportSettings.maxFileSizeUnit.KB")}</option>
                <option value="MB" ${"MB"===(d.maxFileSizeUnit||"KB")?"selected":""}>${(0,p.t)("admin.sizes.exportSettings.maxFileSizeUnit.MB")}</option>
              </select>
            </div>
            <div class="hint">${(0,p.t)("admin.sizes.exportSettings.maxFileSizeHint")}</div>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${(0,p.t)("admin.sizes.exportSettings.habrBorder")}</label>
            <div class="checkbox-group" style="margin-bottom: var(--spacing-sm);">
              <input type="checkbox" id="defaultHabrBorderEnabled" ${d.habrBorderEnabled?"checked":""}>
              <label for="defaultHabrBorderEnabled" style="margin: 0;">${(0,p.t)("admin.sizes.exportSettings.habrBorderEnabled")}</label>
            </div>
            <div class="input-group" style="display: flex; gap: 8px; align-items: center;">
              <label for="defaultHabrBorderColor" class="sr-only">${(0,p.t)("admin.sizes.exportSettings.habrBorderColor")}</label>
              <input type="color" id="defaultHabrBorderColor" value="${d.habrBorderColor||"#D5DDDF"}" style="flex: 0 0 60px;">
              <input type="text" id="defaultHabrBorderColorHex" class="theme-input" value="${d.habrBorderColor||"#D5DDDF"}" placeholder="#D5DDDF" style="flex: 1;">
            </div>
            <div class="hint">${(0,p.t)("admin.sizes.exportSettings.habrBorderHint")}</div>
          </div>
        </div>
      </div>
    </div>
  `})()}
          </div>
        </div>
        
        <!-- Раздел: Название бренда -->
        <div class="admin-accordion-section" data-section="brand" style="margin-bottom: 16px; border: 1px solid ${h}; border-radius: 8px; background: ${c}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${g};" data-accordion-toggle="brand">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${i};">label</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${i};">Название бренда</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${i}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionBrand" style="padding: 20px; display: none;">
            <div class="admin-info-box" style="margin-bottom: 20px;">
              <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
                <span class="material-icons" style="font-size: var(--font-size-lg); color: #2196F3; flex-shrink: 0; margin-top: 2px;">info</span>
                <div>
                  <div style="font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--spacing-xs); font-size: var(--font-size-md);">Изменение названия бренда</div>
                  <div style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;">
                    Здесь вы можете изменить название бренда, которое используется в заголовке страницы и в текстах по умолчанию. Например, вместо "Практикума" можно указать название вашей компании или проекта.
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm); display: block;">
                Название бренда
              </label>
              <input 
                type="text" 
                id="brandNameInput" 
                value="${(0,f.getState)().brandName||"Практикума"}" 
                placeholder="Практикума"
                style="width: 100%; padding: 12px; border: 1px solid ${h}; border-radius: 8px; background: ${c}; color: ${i}; font-size: 14px; font-family: inherit;"
              />
              <div class="hint" style="margin-top: 8px; font-size: 12px; color: ${j};">
                Это название будет использоваться в текстах по умолчанию (например, в заголовке курса)
              </div>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
              <div style="padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
                <div style="font-size: 12px; color: ${j}; margin-bottom: 4px;">Пример использования:</div>
                <div style="font-size: 14px; color: ${i}; font-weight: 500;" id="brandNamePreview">
                  AI-Craft — ${(0,f.getState)().brandName||"Практикума"}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Раздел: Умножение -->
        <div class="admin-accordion-section" data-section="multipliers" style="margin-bottom: 16px; border: 1px solid ${h}; border-radius: 8px; background: ${c}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${g};" data-accordion-toggle="multipliers">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${i};">zoom_in</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${i};">Умножение</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${i}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionMultipliers" style="padding: 20px; display: none;">
            ${(()=>{try{let a=y();return console.log("renderMultipliersTab вернул:",typeof a,"длина:",a?a.length:0),a||"<div>Ошибка загрузки множителей</div>"}catch(a){return console.error("Ошибка при рендеринге множителей:",a),`<div style="padding: 20px; color: red;">Ошибка загрузки множителей: ${a.message}</div>`}})()}
          </div>
        </div>
        
        <!-- Раздел: Фоны -->
        <div class="admin-accordion-section" data-section="backgrounds" style="margin-bottom: 16px; border: 1px solid ${h}; border-radius: 8px; background: ${c}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${g};" data-accordion-toggle="backgrounds">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${i};">palette</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${i};">Фоны</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${i}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionBackgrounds" style="padding: 20px; display: none;">
            ${(()=>{try{let a=z();return console.log("renderBackgroundsTab вернул:",typeof a,"длина:",a?a.length:0),a||"<div>Ошибка загрузки фонов</div>"}catch(a){return console.error("Ошибка при рендеринге фонов:",a),`<div style="padding: 20px; color: red;">Ошибка загрузки фонов: ${a.message}</div>`}})()}
          </div>
        </div>
        
        <!-- Раздел: Полный сброс -->
        <div style="margin-top: 24px; padding: 20px; border: 2px solid #E84033; border-radius: 8px; background: rgba(232, 64, 51, 0.05);">
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
            <span class="material-icons" style="font-size: 24px; color: #E84033; flex-shrink: 0;">warning</span>
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${i};">Полный сброс всех настроек</h3>
              <p style="margin: 0; font-size: 13px; color: ${j}; line-height: 1.5;">
                Эта кнопка полностью сбросит все настройки, связанные с Практикумом: логотипы, фотографии, тексты, значения по умолчанию, размеры и другие настройки. Все будет возвращено к исходным значениям. Это действие нельзя отменить.
              </p>
            </div>
          </div>
          <button class="btn btn-danger" id="sizesAdminFullReset" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600;">
            <span class="material-icons">delete_forever</span>
            Полностью сбросить все настройки Практикума
          </button>
        </div>
      </div>
      
      <div class="sizes-admin-footer" style="padding: 16px 20px; border-top: 1px solid ${h}; display: flex; gap: 8px; justify-content: space-between; align-items: center; flex-shrink: 0; background: ${g};">
        <div style="display: flex; gap: 8px; align-items: center;">
          ${!(0,r.gC)()?`
            <button class="btn" id="sizesAdminChangePassword" style="
              padding: 8px 16px;
              background: transparent;
              border: 1px solid ${h};
              border-radius: 6px;
              color: ${i};
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
            " title="Изменить пароль">
              <span class="material-icons" style="font-size: 18px;">lock</span>
              <span>Изменить пароль</span>
            </button>
          `:""}
          <button class="btn" id="sizesAdminExportFull" title="Экспортировать полную конфигурацию (все настройки) для передачи другой команде">
            <span class="material-icons">file_download</span> Экспорт полной конфигурации
          </button>
          <button class="btn" id="sizesAdminImportFull" title="Импортировать полную конфигурацию из файла">
            <span class="material-icons">file_upload</span> Импорт полной конфигурации
          </button>
          <input type="file" id="sizesAdminImportFullFile" accept=".json" style="display: none;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" id="sizesAdminSave">Сохранить</button>
          <button class="btn" id="sizesAdminCancel">Отмена</button>
        </div>
      </div>
      </div>
    </div>
  `;try{document.body.appendChild(s),requestAnimationFrame(()=>{s.style.display="flex",s.style.visibility="visible",s.style.opacity="1"}),console.log("Модальное окно добавлено в DOM"),console.log("Модальное окно видимо:",null!==s.offsetParent),console.log("Z-index модального окна:",window.getComputedStyle(s).zIndex),console.log("Display:",window.getComputedStyle(s).display),console.log("Visibility:",window.getComputedStyle(s).visibility),console.log("Position:",window.getComputedStyle(s).position),console.log("Width:",s.offsetWidth,"Height:",s.offsetHeight),console.log("ClientWidth:",s.clientWidth,"ClientHeight:",s.clientHeight);let b=s.querySelector(".sizes-admin-content");b?console.log("Контент найден, размеры:",b.offsetWidth,"x",b.offsetHeight):console.error("Контент НЕ найден!"),E(a),console.log("Платформы отрендерены");let c=s.querySelector("#adminSectionMultipliers"),d=s.querySelector("#adminSectionBackgrounds"),e=s.querySelector("#adminSectionFiles");console.log("Проверка разделов:",{multipliers:{exists:!!c,hasContent:!!c&&c.innerHTML.length>0,contentLength:c?c.innerHTML.length:0},backgrounds:{exists:!!d,hasContent:!!d&&d.innerHTML.length>0,contentLength:d?d.innerHTML.length:0},files:{exists:!!e,hasContent:!!e&&e.innerHTML.length>0,contentLength:e?e.innerHTML.length:0}}),v=null,H(),G(a),I(),J(),L();let f=s.querySelector('.sizes-admin-menu-item[data-section="sizes"]');if(f){let a=getComputedStyle(document.documentElement).getPropertyValue("--bg-secondary")||"#141414";f.style.background=a}console.log("Обработчики событий установлены")}catch(a){throw console.error("Ошибка при создании админки:",a),t=!1,a}let m=s.querySelector(".sizes-admin-overlay"),n=s.querySelector("#sizesAdminClose"),o=s.querySelector("#sizesAdminCancel");m&&m.addEventListener("click",D),n&&n.addEventListener("click",D),o&&o.addEventListener("click",D);let q=a=>{"Escape"===a.key&&D()};document.addEventListener("keydown",q),s._escapeHandler=q,console.log("Админка размеров открыта")},D=()=>{console.log("closeSizesAdmin вызвана"),console.log("isAdminOpen:",t),console.log("adminModal:",s);let a=document.getElementById("sizesAdminModal");a&&(console.log("Удаляем модальное окно из DOM"),a._escapeHandler&&document.removeEventListener("keydown",a._escapeHandler),a.parentNode&&a.parentNode.removeChild(a)),s=null,t=!1,u=!1,console.log("Модальное окно закрыто, флаги сброшены")},E=a=>{let b=document.getElementById("sizesAdminPlatforms");if(!b)return;let c=getComputedStyle(document.documentElement).getPropertyValue("--border-color")||"#2a2a2a",d=getComputedStyle(document.documentElement).getPropertyValue("--bg-primary")||"#0d0d0d",e=getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9",g=getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999",h=(0,f.getState)(),i={Ozon:{"2832x600":{width:2100,height:570,hideLegal:!1,hideAge:!1,titleAlign:"left"},"1080x450":{width:1020,height:405,hideLegal:!1,hideAge:!1,titleAlign:"left"}},РСЯ:{"1600x1200":{width:900,height:900,hideLegal:!0,hideAge:!0,titleAlign:"center"}},РСЯ:{"1600x1200":{width:900,height:900,hideLegal:!0,hideAge:!0,titleAlign:"center"}}},j=h.safeAreas||{},k=x(h),l=[{key:"ultraWide",label:"Ультра-широкие",icon:"panorama_wide_angle",color:"#2196F3",description:"width ≥ height \xd7 8 — например, большие баннеры и растяжки"},{key:"veryWide",label:"Очень широкие",icon:"view_stream",color:"#9C27B0",description:"width ≥ height \xd7 4 — широкие промо-форматы"},{key:"horizontal",label:"Широкие",icon:"crop_landscape",color:"#4CAF50",description:"width ≥ height \xd7 1.5 — классические горизонтальные"},{key:"vertical",label:"Вертикальные",icon:"crop_portrait",color:"#FF9800",description:"height ≥ width \xd7 1.5 — сторис и баннеры-вытяжки"},{key:"tall",label:"Длинные вертикали",icon:"align_vertical_top",color:"#E91E63",description:"height ≥ width \xd7 2 — особенно вытянутые форматы"},{key:"square",label:"Квадратные/приближённые",icon:"crop_square",color:"#FFC107",description:"aspect ≈ 1 — квадратные или около того"}].map(a=>{let b=w(k?.[a.key],8);return b?`
      <div class="sizes-admin-format-hint" style="display: flex; gap: 10px; padding: 12px; border: 1px solid ${c}; border-left: 4px solid ${a.color}; border-radius: 8px; background: rgba(255,255,255,0.02);">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center;">
          <span class="material-icons" style="color: ${a.color}; font-size: 18px;">${a.icon}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-weight: 600; font-size: 13px; color: ${e};">${a.label}</div>
          <div style="font-size: 11px; color: ${g};">${a.description}</div>
          <div style="font-size: 11px; color: ${g}; opacity: 0.9;">${b}</div>
        </div>
      </div>
    `:""}).filter(Boolean).join(""),m="";l&&(m+=`
      <div class="sizes-admin-format-hints" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 12px; color: ${g}; line-height: 1.4;">
          Подписи ниже показывают, какие размеры сейчас попадают в каждый тип. Так проще понять, что изменится, если настроить, например, ультра-широкие форматы.
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          ${l}
        </div>
      </div>
    `),Object.keys(a).forEach(b=>{let f=(a=>{let b={square:[],horizontal:[],vertical:[],"near-square":[]};return a.forEach((a,c)=>{b[((a,b)=>{let c=a/b;return .1>Math.abs(c-1)?"square":c>1.2?"horizontal":c<.8?"vertical":"near-square"})(a.width,a.height)].push({...a,originalIndex:c})}),b})(a[b]);m+=`
      <div class="sizes-admin-platform" data-platform="${b}" style="margin-bottom: 24px; border: 1px solid ${c}; border-radius: 8px; padding: 16px; background: ${d};">
        <div class="sizes-admin-platform-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${c};">
          <span class="material-icons" style="color: ${g}; font-size: 20px;">category</span>
          <input type="text" class="sizes-admin-platform-name" value="${b}" data-original="${b}" style="flex: 1; font-weight: 600; font-size: 16px;">
          <span style="color: ${g}; font-size: 12px;">${a[b].length} ${1===a[b].length?"размер":a[b].length<5?"размера":"размеров"}</span>
          <button class="btn-small btn-danger" data-action="remove-platform" data-platform="${b}" title="Удалить платформу">
            <span class="material-icons">delete</span>
          </button>
        </div>
        <div class="sizes-admin-sizes-list">
    `,["square","horizontal","vertical","near-square"].forEach(a=>{if(f[a].length>0){let k=(a=>{switch(a){case"square":return"#4CAF50";case"horizontal":return"#2196F3";case"vertical":return"#FF9800";default:return g}})(a),l=(a=>{switch(a){case"square":return"crop_square";case"horizontal":return"crop_landscape";case"vertical":return"crop_portrait";default:return"aspect_ratio"}})(a),n=(a=>{switch(a){case"square":return"Квадратный";case"horizontal":return"Горизонтальный";case"vertical":return"Вертикальный";default:return"Почти квадратный"}})(a);m+=`
          <div class="sizes-admin-format-group" style="margin-bottom: 16px; padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 6px; border-left: 3px solid ${k};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span class="material-icons" style="color: ${k}; font-size: 18px;">${l}</span>
              <span style="color: ${e}; font-weight: 500; font-size: 13px;">${n} (${f[a].length})</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
        `,f[a].forEach(a=>{let f=(a.width/a.height).toFixed(2),l=a.originalIndex,n=`${a.width}x${a.height}`,o=((a,b)=>j[a]&&j[a][b]?j[a][b]:i[a]&&i[a][b]?i[a][b]:null)(b,n),q=((a,b)=>!!(j[a]&&j[a][b]))(b,n),r=!!(i[b]&&i[b][n]),s=((a,b)=>j[a]&&j[a][b]&&void 0!==j[a][b].hideLegal?j[a][b].hideLegal:!!i[a]&&!!i[a][b]&&void 0!==i[a][b].hideLegal&&i[a][b].hideLegal)(b,n),t=((a,b)=>j[a]&&j[a][b]&&void 0!==j[a][b].hideAge?j[a][b].hideAge:!!i[a]&&!!i[a][b]&&void 0!==i[a][b].hideAge&&i[a][b].hideAge)(b,n),u=((a,b)=>j[a]&&j[a][b]&&void 0!==j[a][b].titleAlign?j[a][b].titleAlign:i[a]&&i[a][b]&&void 0!==i[a][b].titleAlign?i[a][b].titleAlign:null)(b,n);m+=`
            <div class="sizes-admin-size-item" style="display: flex; flex-direction: column; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid ${c};">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                  <div style="width: 40px; height: 40px; border: 2px solid ${k}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); position: relative; overflow: hidden;" title="Пропорции: ${f}:1">
                    <div style="position: absolute; width: ${Math.min(100,a.width/Math.max(a.width,a.height)*100)}%; height: ${Math.min(100,a.height/Math.max(a.width,a.height)*100)}%; background: ${k}; opacity: 0.3;"></div>
                    <span style="font-size: 10px; color: ${e}; font-weight: 600; z-index: 1;">${f}</span>
                  </div>
                  <input type="number" class="sizes-admin-size-width" value="${a.width}" min="1" placeholder="Ширина" data-platform="${b}" data-index="${l}" style="width: 100px; padding: 6px 8px; border: 1px solid ${c}; border-radius: 4px; background: ${d}; color: ${e};">
                  <span style="color: ${g};">\xd7</span>
                  <input type="number" class="sizes-admin-size-height" value="${a.height}" min="1" placeholder="Высота" data-platform="${b}" data-index="${l}" style="width: 100px; padding: 6px 8px; border: 1px solid ${c}; border-radius: 4px; background: ${d}; color: ${e};">
                  <span style="color: ${g}; font-size: 12px; min-width: 60px;">${a.width}\xd7${a.height}</span>
                </div>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
                  <input type="checkbox" ${a.checked?"checked":""} class="sizes-admin-size-checked" data-platform="${b}" data-index="${l}" style="cursor: pointer;">
                  <span style="color: ${g}; font-size: 12px;">Выбрано</span>
                </label>
                <button class="btn-small btn-danger" data-action="remove-size" data-platform="${b}" data-index="${l}" title="Удалить размер" style="padding: 6px;">
                  <span class="material-icons" style="font-size: 18px;">close</span>
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 4px; border-left: 3px solid ${q?"#4CAF50":r?"#FF9800":"#666666"};">
                <div class="size-settings-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; cursor: pointer; user-select: none;" data-size-key="${n}" data-platform="${b}">
                  <span class="material-icons size-settings-icon" style="color: ${q?"#4CAF50":r?"#FF9800":"#666666"}; font-size: 16px; transition: transform 0.3s;">expand_more</span>
                  <span class="material-icons" style="color: ${q?"#4CAF50":r?"#FF9800":"#666666"}; font-size: 16px;">crop_free</span>
                  <span style="color: ${e}; font-size: 12px; font-weight: 500;">${(0,p.t)("admin.sizes.safeArea.title")}</span>
                  <span style="color: ${g}; font-size: 11px; margin-left: auto;">${q?(0,p.t)("admin.sizes.safeArea.custom"):r?(0,p.t)("admin.sizes.safeArea.default"):"default"}</span>
                </div>
                <div class="size-settings-content" style="display: none;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="color: ${g}; font-size: 11px; min-width: 80px;">${(0,p.t)("admin.sizes.safeArea.width")}:</label>
                    <input type="number" class="sizes-admin-safe-area-width" value="${o?o.width:""}" min="1" placeholder="${r&&i[b][n]?.width||"default"}" data-platform="${b}" data-size-key="${n}" style="width: 90px; padding: 4px 6px; border: 1px solid ${c}; border-radius: 4px; background: ${d}; color: ${e}; font-size: 12px;">
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="color: ${g}; font-size: 11px; min-width: 80px;">${(0,p.t)("admin.sizes.safeArea.height")}:</label>
                    <input type="number" class="sizes-admin-safe-area-height" value="${o?o.height:""}" min="1" placeholder="${r&&i[b][n]?.height||"default"}" data-platform="${b}" data-size-key="${n}" style="width: 90px; padding: 4px 6px; border: 1px solid ${c}; border-radius: 4px; background: ${d}; color: ${e}; font-size: 12px;">
                  </div>
                  ${q?`
                  <button class="btn-small" data-action="clear-safe-area" data-platform="${b}" data-size-key="${n}" title="Вернуть к умолчанию" style="padding: 4px 8px; font-size: 11px;">
                    <span class="material-icons" style="font-size: 14px;">refresh</span>
                  </button>
                  `:""}
                </div>
                <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
                    <input type="checkbox" ${s?"checked":""} class="sizes-admin-hide-legal" data-platform="${b}" data-size-key="${n}" style="cursor: pointer;">
                    <span style="color: ${g}; font-size: 11px;">Скрыть лигал</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
                    <input type="checkbox" ${t?"checked":""} class="sizes-admin-hide-age" data-platform="${b}" data-size-key="${n}" style="cursor: pointer;">
                    <span style="color: ${g}; font-size: 11px;">Скрыть возраст</span>
                  </label>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                  <label style="color: ${g}; font-size: 11px; min-width: 80px;">Выключка текста:</label>
                  <select class="sizes-admin-title-align" data-platform="${b}" data-size-key="${n}" style="width: 120px; padding: 4px 6px; border: 1px solid ${c}; border-radius: 4px; background: ${d}; color: ${e}; font-size: 12px;">
                    <option value="" ${null===u?"selected":""}>По умолчанию</option>
                    <option value="left" ${"left"===u?"selected":""}>Слева</option>
                    <option value="center" ${"center"===u?"selected":""}>По центру</option>
                    <option value="right" ${"right"===u?"selected":""}>Справа</option>
                  </select>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                  <label style="color: ${g}; font-size: 11px; min-width: 80px;">Множитель логотипа:</label>
                  <input type="number" class="sizes-admin-logo-size-multiplier" value="${h.logoSizeMultipliers?.[b]?.[n]??""}" step="0.1" min="0.1" max="10" placeholder="По умолчанию" data-platform="${b}" data-size-key="${n}" style="width: 120px; padding: 4px 6px; border: 1px solid ${c}; border-radius: 4px; background: ${d}; color: ${e}; font-size: 12px;">
                  ${h.logoSizeMultipliers?.[b]?.[n]?`
                  <button class="btn-small" data-action="clear-logo-size-multiplier" data-platform="${b}" data-size-key="${n}" title="Вернуть к умолчанию" style="padding: 4px 8px; font-size: 11px;">
                    <span class="material-icons" style="font-size: 14px;">refresh</span>
                  </button>
                  `:""}
                </div>
                <div style="color: ${g}; font-size: 10px; margin-top: 4px;">${(0,p.t)("admin.sizes.safeArea.hint")}</div>
                </div>
              </div>
            </div>
          `}),m+=`
            </div>
          </div>
        `}}),m+=`
        </div>
        <button class="btn-small" data-action="add-size" data-platform="${b}" style="margin-top: 12px; width: 100%;">
          <span class="material-icons">add</span> Добавить размер
        </button>
      </div>
    `}),b.innerHTML=m},F=(a,b,c)=>{let d=a.querySelector('div[title*="Пропорции"]');if(!d)return;let e=(b/c).toFixed(2),f=(()=>{let a=b/c;return .1>Math.abs(a-1)?"square":a>1.2?"horizontal":a<.8?"vertical":"near-square"})(),g=(()=>{switch(f){case"square":return"#4CAF50";case"horizontal":return"#2196F3";case"vertical":return"#FF9800";default:return"#999999"}})(),h=getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9";d.style.borderColor=g,d.title=`Пропорции: ${e}:1`;let i=d.querySelector("div");i&&(i.style.background=g,i.style.width=`${Math.min(100,b/Math.max(b,c)*100)}%`,i.style.height=`${Math.min(100,c/Math.max(b,c)*100)}%`);let j=d.querySelector("span");j&&(j.textContent=e,j.style.color=h)},G=a=>{let b=JSON.parse(JSON.stringify(a));document.getElementById("sizesAdminAddPlatform").addEventListener("click",()=>{let a=prompt("Введите название платформы:");if(a&&a.trim()){let c=a.trim();if(b[c])return void alert("Платформа с таким названием уже существует");b[c]=[],E(b),G(b)}}),document.getElementById("sizesAdminPlatforms").addEventListener("click",a=>{if(a.target.closest('[data-action="remove-platform"]')){let c=a.target.closest('[data-action="remove-platform"]').dataset.platform;confirm(`Удалить платформу "${c}" и все её размеры?`)&&(delete b[c],E(b),G(b))}}),document.getElementById("sizesAdminPlatforms").addEventListener("change",a=>{if(a.target.classList.contains("sizes-admin-platform-name")){let c=a.target.dataset.original,d=a.target.value.trim();if(d&&d!==c){if(b[d]){alert("Платформа с таким названием уже существует"),a.target.value=c;return}b[d]=b[c],delete b[c],a.target.dataset.original=d,a.target.closest(".sizes-admin-platform").dataset.platform=d,G(b)}}}),document.getElementById("sizesAdminPlatforms").addEventListener("click",a=>{if(a.target.closest('[data-action="add-size"]')){let c=a.target.closest('[data-action="add-size"]').dataset.platform;b[c]||(b[c]=[]),b[c].push({width:1080,height:1080,checked:!0}),E(b),G(b)}}),document.getElementById("sizesAdminPlatforms").addEventListener("click",a=>{if(a.target.closest('[data-action="remove-size"]')){let c=a.target.closest('[data-action="remove-size"]'),d=c.dataset.platform,e=parseInt(c.dataset.index,10);b[d]&&b[d][e]&&(b[d].splice(e,1),E(b),G(b))}});let c=document.getElementById("brandNameInput");c&&c.addEventListener("input",a=>{let b=a.target.value.trim()||"Практикума",c=document.getElementById("brandNamePreview");c&&(c.textContent=`AI-Craft — ${b}`)}),document.getElementById("sizesAdminPlatforms").addEventListener("input",a=>{let c=a.target.closest(".sizes-admin-size-item");if(!c)return;let d=c.closest(".sizes-admin-platform").dataset.platform,e=c.querySelector('[data-action="remove-size"]');if(!e)return;let g=parseInt(e.dataset.index,10);if(b[d]&&void 0!==b[d][g]){let a=c.querySelector(".sizes-admin-size-width"),e=c.querySelector(".sizes-admin-size-height"),h=c.querySelector(".sizes-admin-size-checked");if(a){let h=parseInt(a.value,10);if(!isNaN(h)&&h>0){let a=b[d][g].width,i=b[d][g].height,j=`${a}x${i}`;b[d][g].width=h;let k=parseInt(e.value,10)||b[d][g].height,l=`${h}x${k}`;if(j!==l){let a=(0,f.getState)().safeAreas||{};a[d]&&a[d][j]&&(a[d][l]=a[d][j],delete a[d][j],0===Object.keys(a[d]).length&&delete a[d],(0,f.setKey)("safeAreas",a),E(b),G(b))}let m=c.querySelector('span[style*="min-width: 60px"]');if(m&&e){let a=parseInt(e.value,10)||b[d][g].height;m.textContent=`${h}\xd7${a}`}F(c,h,parseInt(e?.value||b[d][g].height,10))}}if(e){let h=parseInt(e.value,10);if(!isNaN(h)&&h>0){let e=b[d][g].width,i=b[d][g].height,j=`${e}x${i}`;b[d][g].height=h;let k=parseInt(a.value,10)||b[d][g].width,l=`${k}x${h}`;if(j!==l){let a=(0,f.getState)().safeAreas||{};a[d]&&a[d][j]&&(a[d][l]=a[d][j],delete a[d][j],0===Object.keys(a[d]).length&&delete a[d],(0,f.setKey)("safeAreas",a),E(b),G(b))}let m=c.querySelector('span[style*="min-width: 60px"]');if(m&&a){let c=parseInt(a.value,10)||b[d][g].width;m.textContent=`${c}\xd7${h}`}F(c,parseInt(a?.value||b[d][g].width,10),h)}}h&&(b[d][g].checked=h.checked)}if(a.target.classList.contains("sizes-admin-safe-area-width")||a.target.classList.contains("sizes-admin-safe-area-height")){let c=a.target.dataset.platform,d=a.target.dataset.sizeKey,e=a.target.closest(".sizes-admin-size-item")?.querySelector(".sizes-admin-safe-area-width"),g=a.target.closest(".sizes-admin-size-item")?.querySelector(".sizes-admin-safe-area-height");if(c&&d&&e&&g){let a=parseInt(e.value,10),h=parseInt(g.value,10),i=JSON.parse(JSON.stringify((0,f.getState)().safeAreas||{}));if(!isNaN(a)&&a>0&&!isNaN(h)&&h>0){i[c]||(i[c]={});let e=i[c][d]||{};i[c][d]={width:a,height:h,hideLegal:void 0!==e.hideLegal&&e.hideLegal,hideAge:void 0!==e.hideAge&&e.hideAge,titleAlign:void 0!==e.titleAlign?e.titleAlign:void 0},(0,f.setKey)("safeAreas",i),E(b),G(b)}else i[c]&&i[c][d]&&(delete i[c][d],0===Object.keys(i[c]).length&&delete i[c],(0,f.setKey)("safeAreas",i),E(b),G(b))}}}),document.getElementById("sizesAdminPlatforms").addEventListener("click",a=>{if(a.target.closest('[data-action="clear-safe-area"]')){let c=a.target.closest('[data-action="clear-safe-area"]'),d=c.dataset.platform,e=c.dataset.sizeKey;if(d&&e){let a=(0,f.getState)().safeAreas||{};a[d]&&a[d][e]&&(delete a[d][e],0===Object.keys(a[d]).length&&delete a[d],(0,f.setKey)("safeAreas",a),E(b),G(b))}}}),document.getElementById("sizesAdminPlatforms").addEventListener("input",a=>{if(a.target.classList.contains("sizes-admin-logo-size-multiplier")){let c=a.target.dataset.platform,d=a.target.dataset.sizeKey,e=parseFloat(a.target.value);if(c&&d){let g=JSON.parse(JSON.stringify((0,f.getState)().logoSizeMultipliers||{}));!isNaN(e)&&e>0?(g[c]||(g[c]={}),g[c][d]=e,(0,f.setKey)("logoSizeMultipliers",g),"undefined"!=typeof localStorage&&localStorage.setItem("logoSizeMultipliers",JSON.stringify(g)),h.renderer&&h.renderer.renderSync&&h.renderer.renderSync(),E(b),G(b)):(""===a.target.value||isNaN(e))&&g[c]&&g[c][d]&&(delete g[c][d],0===Object.keys(g[c]).length&&delete g[c],(0,f.setKey)("logoSizeMultipliers",g),"undefined"!=typeof localStorage&&localStorage.setItem("logoSizeMultipliers",JSON.stringify(g)),h.renderer&&h.renderer.renderSync&&h.renderer.renderSync(),E(b),G(b))}}}),document.getElementById("sizesAdminPlatforms").addEventListener("click",a=>{if(a.target.closest('[data-action="clear-logo-size-multiplier"]')){let c=a.target.closest('[data-action="clear-logo-size-multiplier"]'),d=c.dataset.platform,e=c.dataset.sizeKey;if(d&&e){let a=JSON.parse(JSON.stringify((0,f.getState)().logoSizeMultipliers||{}));a[d]&&a[d][e]&&(delete a[d][e],0===Object.keys(a[d]).length&&delete a[d],(0,f.setKey)("logoSizeMultipliers",a),"undefined"!=typeof localStorage&&localStorage.setItem("logoSizeMultipliers",JSON.stringify(a)),h.renderer&&h.renderer.renderSync&&h.renderer.renderSync(),E(b),G(b))}}}),document.getElementById("sizesAdminPlatforms").addEventListener("change",a=>{if(a.target.classList.contains("sizes-admin-hide-legal")||a.target.classList.contains("sizes-admin-hide-age")||a.target.classList.contains("sizes-admin-title-align")){let b=a.target.dataset.platform,c=a.target.dataset.sizeKey,d=a.target.classList.contains("sizes-admin-hide-legal"),e=a.target.classList.contains("sizes-admin-hide-age"),g=a.target.classList.contains("sizes-admin-title-align");if(b&&c){let h=JSON.parse(JSON.stringify((0,f.getState)().safeAreas||{}));h[b]||(h[b]={});let i=h[b][c]||{},j={Ozon:{"2832x600":{width:2100,height:570,hideLegal:!1,hideAge:!1,titleAlign:"left"},"1080x450":{width:1020,height:405,hideLegal:!1,hideAge:!1,titleAlign:"left"}},РСЯ:{"1600x1200":{width:900,height:900,hideLegal:!0,hideAge:!0,titleAlign:"center"}},РСЯ:{"1600x1200":{width:900,height:900,hideLegal:!0,hideAge:!0,titleAlign:"center"}}};if(!i.width||!i.height){let a=j[b]&&j[b][c];a&&(i.width=a.width,i.height=a.height)}if(d)i.hideLegal=a.target.checked;else if(e)i.hideAge=a.target.checked;else if(g){let b=a.target.value;""===b?delete i.titleAlign:i.titleAlign=b}h[b][c]=i,(0,f.setKey)("safeAreas",h)}}});let i=document.getElementById("sizesAdminChangePassword");i&&i.addEventListener("click",()=>{let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",c=a.getPropertyValue("--bg-secondary")||"#141414",d=a.getPropertyValue("--border-color")||"#2a2a2a",e=a.getPropertyValue("--text-primary")||"#e9e9e9",f=a.getPropertyValue("--text-secondary")||"#999999",g=document.createElement("div");g.id="sizesVerifyPasswordModal",g.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
      `,g.innerHTML=`
        <div style="background: ${c}; border: 1px solid ${d}; border-radius: 12px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <span class="material-icons" style="font-size: 28px; color: #2196F3;">lock</span>
            <h2 style="margin: 0; font-size: 20px; color: ${e};">Подтверждение</h2>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">Введите пароль еще раз</label>
            <input type="password" id="sizesVerifyPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="Введите пароль" autofocus>
            <div id="sizesVerifyPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Неверный пароль</div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="sizesVerifyPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${d}; border-radius: 8px; color: ${e}; cursor: pointer;">Отмена</button>
            <button id="sizesVerifyPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">Продолжить</button>
          </div>
        </div>
      `,document.body.appendChild(g);let h=document.getElementById("sizesVerifyPasswordInput"),i=document.getElementById("sizesVerifyPasswordError"),j=document.getElementById("sizesVerifyPasswordSubmit"),k=document.getElementById("sizesVerifyPasswordCancel"),l=()=>{(0,o.O7)(h.value)?(g.remove(),(()=>{let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",c=a.getPropertyValue("--bg-secondary")||"#141414",d=a.getPropertyValue("--border-color")||"#2a2a2a",e=a.getPropertyValue("--text-primary")||"#e9e9e9",f=a.getPropertyValue("--text-secondary")||"#999999";(0,o.Qq)();let g=(0,o.cw)(),h=document.createElement("div");h.id="sizesChangePasswordModal",h.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  `,h.innerHTML=`
    <div style="background: ${c}; border: 1px solid ${d}; border-radius: 12px; padding: 32px; max-width: 450px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <span class="material-icons" style="font-size: 28px; color: #2196F3;">lock</span>
        <h2 style="margin: 0; font-size: 20px; color: ${e};">Изменение пароля</h2>
      </div>
      ${g?`
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">Текущий пароль</label>
        <input type="password" id="sizesCurrentPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="Введите текущий пароль" autofocus>
        <div id="sizesCurrentPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Неверный пароль</div>
      </div>
      `:""}
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">Новый пароль</label>
        <input type="password" id="sizesNewPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="Введите новый пароль" ${!g?"autofocus":""}>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">Подтвердите новый пароль</label>
        <input type="password" id="sizesConfirmPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="Повторите новый пароль">
        <div id="sizesPasswordMatchError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Пароли не совпадают</div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 8px; color: ${f}; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="sizesRemovePasswordCheckbox" style="width: 18px; height: 18px; cursor: pointer;">
          <span>Удалить пароль (админка будет открываться без пароля)</span>
        </label>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="sizesChangePasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${d}; border-radius: 8px; color: ${e}; cursor: pointer;">Отмена</button>
        <button id="sizesChangePasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">Сохранить</button>
      </div>
    </div>
  `,document.body.appendChild(h);let i=document.getElementById("sizesCurrentPasswordInput"),j=document.getElementById("sizesNewPasswordInput"),k=document.getElementById("sizesConfirmPasswordInput"),l=document.getElementById("sizesRemovePasswordCheckbox"),m=document.getElementById("sizesCurrentPasswordError"),n=document.getElementById("sizesPasswordMatchError"),p=document.getElementById("sizesChangePasswordSubmit"),q=document.getElementById("sizesChangePasswordCancel");l&&l.addEventListener("change",a=>{a.target.checked?(j.disabled=!0,k.disabled=!0,j.value="",k.value=""):(j.disabled=!1,k.disabled=!1,j.focus())});let r=()=>{if(g&&i&&!(0,o.O7)(i.value)){m.style.display="block",i.style.borderColor="#f44336",i.focus();return}if(l&&l.checked){(0,o.wO)(""),h.remove(),alert("Пароль удален. Админка теперь открывается без пароля.");return}let a=j.value,b=k.value;if(!a){alert("Введите новый пароль"),j.focus();return}if(a!==b){n.style.display="block",k.style.borderColor="#f44336",k.focus();return}(0,o.wO)(a),h.remove(),alert("Пароль успешно изменен!")};p.addEventListener("click",r),q.addEventListener("click",()=>{h.remove()}),[i,j,k].forEach(a=>{a&&a.addEventListener("keydown",a=>{"Enter"===a.key?r():"Escape"===a.key&&h.remove()})}),h.addEventListener("click",a=>{a.target===h&&h.remove()}),setTimeout(()=>{g&&i?i.focus():j&&j.focus()},100)})()):(i.style.display="block",h.style.borderColor="#f44336",h.value="",h.focus())};j.addEventListener("click",l),k.addEventListener("click",()=>{g.remove()}),h.addEventListener("keydown",a=>{"Enter"===a.key?l():"Escape"===a.key&&g.remove()}),g.addEventListener("click",a=>{a.target===g&&g.remove()}),setTimeout(()=>{h.focus()},100)}),document.getElementById("sizesAdminSave").addEventListener("click",async()=>{for(let[a,c]of Object.entries(b)){if(!a||!a.trim())return void alert("Название платформы не может быть пустым");for(let b of c)if(!b.width||!b.height||b.width<=0||b.height<=0)return void alert(`Некорректный размер в платформе "${a}"`)}(0,d.iW)(b),(0,f.updatePresetSizesFromConfig)(),(0,g.iA)(),(0,g.tK)(),(0,g.e9)();let a=(0,f.getDefaultValues)(),c=(a,b)=>{let c=document.getElementById(a);if(c){if("checkbox"===c.type)return c.checked;if("number"===c.type){let a=parseFloat(c.value);return isNaN(a)?b:a}return c.value||b}return b},i={title:c("defaultTitle",""),subtitle:c("defaultSubtitle",""),legal:c("defaultLegal",""),age:c("defaultAge","18+"),bgColor:c("defaultBgColorHex","#1e1e1e"),titleColor:c("defaultTextColorHex","#ffffff"),subtitleColor:c("defaultSubtitleColorHex","#e0e0e0"),legalColor:c("defaultLegalColorHex",a.legalColor),titleSize:c("defaultTitleSize",a.titleSize),titleWeight:c("defaultTitleWeight","Regular"),titleAlign:c("defaultTitleAlign",a.titleAlign),titleVPos:c("defaultTitleVPos",a.titleVPos),titleLetterSpacing:c("defaultTitleLetterSpacing",a.titleLetterSpacing),titleLineHeight:c("defaultTitleLineHeight",a.titleLineHeight),subtitleSize:c("defaultSubtitleSize",a.subtitleSize),subtitleWeight:c("defaultSubtitleWeight","Regular"),subtitleAlign:c("defaultSubtitleAlign",a.subtitleAlign),subtitleOpacity:c("defaultSubtitleOpacity",a.subtitleOpacity),subtitleLetterSpacing:c("defaultSubtitleLetterSpacing",a.subtitleLetterSpacing),subtitleLineHeight:c("defaultSubtitleLineHeight",a.subtitleLineHeight),subtitleGap:c("defaultSubtitleGap",a.subtitleGap),titleSubtitleRatio:c("defaultTitleSubtitleRatio",a.titleSubtitleRatio),legalSize:c("defaultLegalSize",a.legalSize),legalWeight:c("defaultLegalWeight","Regular"),legalAlign:c("defaultLegalAlign",a.legalAlign),legalOpacity:c("defaultLegalOpacity",a.legalOpacity),legalLetterSpacing:c("defaultLegalLetterSpacing",a.legalLetterSpacing),legalLineHeight:c("defaultLegalLineHeight",a.legalLineHeight),ageSize:c("defaultAgeSize",a.ageSize),ageWeight:c("defaultAgeWeight","Regular"),ageGapPercent:c("defaultAgeGapPercent",a.ageGapPercent),fontFamily:(()=>{let b=c("defaultFontFamily",a.fontFamily);return"system-ui"===b?"YS Text":b})(),logoSelected:"",kvSelected:l.UF,logoSize:a.logoSize,logoPos:a.logoPos,logoLanguage:a.logoLanguage,kvBorderRadius:a.kvBorderRadius,kvPosition:a.kvPosition,bgSize:a.bgSize,bgImageSize:a.bgImageSize??100,bgPosition:a.bgPosition,bgVPosition:a.bgVPosition,textGradientOpacity:a.textGradientOpacity,centerTextOverlayOpacity:20,paddingPercent:a.paddingPercent,layoutMode:a.layoutMode,maxFileSizeUnit:c("defaultMaxFileSizeUnit","KB"),maxFileSizeValue:c("defaultMaxFileSizeValue",150),habrBorderEnabled:c("defaultHabrBorderEnabled",!1),habrBorderColor:c("defaultHabrBorderColorHex","#D5DDDF")},j=document.getElementById("brandNameInput");if(j){let a=j.value.trim()||"Практикума";(0,f.setKey)("brandName",a),document.title="AI-Craft";let b=(state=(0,f.getState)()).titleSubtitlePairs.map(b=>{if(b.title&&b.title.includes("от")){let c=b.title.replace(/от\s+[^»]+$/,`от ${a}`);return{...b,title:c}}return b});b.some((a,b)=>a.title!==state.titleSubtitlePairs[b].title)&&(0,f.setState)({titleSubtitlePairs:b}),localStorage.setItem("brandName",a)}localStorage.setItem((0,e.N5)("default-values"),JSON.stringify(i)),(state=(0,f.getState)()).safeAreas?localStorage.setItem("user-safe-areas",JSON.stringify(state.safeAreas)):localStorage.removeItem("user-safe-areas"),state.logoSizeMultipliers?localStorage.setItem("logoSizeMultipliers",JSON.stringify(state.logoSizeMultipliers)):localStorage.removeItem("logoSizeMultipliers");let k=state.formatMultipliers;if(k){localStorage.setItem("format-multipliers",JSON.stringify(k));let a=JSON.parse(JSON.stringify(k));(0,f.setState)({formatMultipliers:a})}try{await (0,q.g5)()}catch(a){console.warn("Не удалось синхронизировать team defaults с workspace API:",a)}setTimeout(()=>{let a=(0,f.getState)();console.log("Значения по умолчанию после сохранения:",{titleSize:a.titleSize,subtitleSize:a.subtitleSize,logoSize:a.logoSize,bgColor:a.bgColor}),h.renderer.render()},50),D(),alert("Все настройки успешно сохранены!")}),document.getElementById("sizesAdminExport").addEventListener("click",()=>{(0,d.NY)()}),document.getElementById("sizesAdminImport").addEventListener("click",()=>{document.getElementById("sizesAdminImportFile").click()}),document.getElementById("sizesAdminImportFile").addEventListener("change",async a=>{let c=a.target.files[0];if(c){try{b=await (0,d.EL)(c),E(b),G(b),alert("Размеры успешно импортированы!")}catch(a){alert(`Ошибка импорта: ${a.message}`)}a.target.value=""}}),document.getElementById("sizesAdminReset").addEventListener("click",()=>{confirm("Сбросить все размеры к дефолтным? Это действие нельзя отменить.")&&(E(b=(0,d.m2)()),G(b))}),document.getElementById("sizesAdminExportFull").addEventListener("click",()=>{try{(()=>{try{let a={version:"1.0.0",exportDate:new Date().toISOString(),description:"Полная конфигурация сервиса для генерации макетов",sizesConfig:(()=>{let a=localStorage.getItem("sizes-config");if(a)try{return JSON.parse(a)}catch(a){console.warn("Ошибка парсинга sizes-config:",a)}return null})(),defaultValues:(()=>{let a=localStorage.getItem((0,e.N5)("default-values"));if(a)try{return JSON.parse(a)}catch(a){console.warn("Ошибка парсинга default-values:",a)}return null})(),formatMultipliers:(()=>{let a=localStorage.getItem("format-multipliers");if(a)try{return JSON.parse(a)}catch(a){console.warn("Ошибка парсинга format-multipliers:",a)}return null})(),adminBackgrounds:(()=>{let a=localStorage.getItem("adminBackgrounds");if(a)try{return JSON.parse(a)}catch(a){console.warn("Ошибка парсинга adminBackgrounds:",a)}return null})(),mediaSources:(()=>{let a=localStorage.getItem((0,e.N5)("media-sources"));if(a)try{return JSON.parse(a)}catch(a){console.warn("Ошибка парсинга media-sources:",a)}return null})(),theme:localStorage.getItem("theme")||"dark",brandName:localStorage.getItem("brandName")||"Практикума"};Object.keys(a).forEach(b=>{null===a[b]&&"sizesConfig"!==b&&"defaultValues"!==b&&delete a[b]});let b=JSON.stringify(a,null,2),c=new Blob([b],{type:"application/json"}),d=URL.createObjectURL(c),f=document.createElement("a");return f.href=d,f.download=`service-config-${new Date().toISOString().split("T")[0]}.json`,document.body.appendChild(f),f.click(),document.body.removeChild(f),URL.revokeObjectURL(d),console.log("Полная конфигурация экспортирована"),!0}catch(a){return console.error("Ошибка при экспорте полной конфигурации:",a),!1}})()?alert("Полная конфигурация успешно экспортирована! Файл содержит все настройки: размеры, значения по умолчанию, множители и фоны. Вы можете передать этот файл другой команде."):alert("Ошибка при экспорте конфигурации. Проверьте консоль для подробностей.")}catch(a){console.error("Ошибка экспорта полной конфигурации:",a),alert(`Ошибка экспорта: ${a.message}`)}}),document.getElementById("sizesAdminImportFull").addEventListener("click",()=>{document.getElementById("sizesAdminImportFullFile").click()}),document.getElementById("sizesAdminImportFullFile").addEventListener("change",async a=>{let c=a.target.files[0];if(c){if(!confirm("Импорт полной конфигурации заменит все текущие настройки. Продолжить?")){a.target.value="";return}try{let a=await new Promise((a,b)=>{let d=new FileReader;d.onload=c=>{try{let b=JSON.parse(c.target.result);if("object"!=typeof b||null===b)throw Error("Некорректный формат файла конфигурации");if(b.sizesConfig)try{localStorage.setItem("sizes-config",JSON.stringify(b.sizesConfig)),console.log("✓ Размеры импортированы")}catch(a){console.warn("Ошибка импорта размеров:",a)}if(b.defaultValues)try{console.log("✓ Значения по умолчанию в конфиге пропущены (сохранение только через админ-панель)")}catch(a){console.warn("Ошибка импорта значений по умолчанию:",a)}if(b.formatMultipliers)try{localStorage.setItem("format-multipliers",JSON.stringify(b.formatMultipliers)),console.log("✓ Множители форматов импортированы")}catch(a){console.warn("Ошибка импорта множителей:",a)}if(b.adminBackgrounds)try{localStorage.setItem("adminBackgrounds",JSON.stringify(b.adminBackgrounds)),console.log("✓ Фоновые изображения импортированы")}catch(a){console.warn("Ошибка импорта фонов:",a)}if(b.mediaSources)try{localStorage.setItem((0,e.N5)("media-sources"),JSON.stringify(b.mediaSources)),console.log("✓ Конфигурация удалённых медиа импортирована")}catch(a){console.warn("Ошибка импорта mediaSources:",a)}if(b.theme)try{localStorage.setItem("theme",b.theme),console.log("✓ Тема импортирована")}catch(a){console.warn("Ошибка импорта темы:",a)}if(b.brandName)try{localStorage.setItem("brandName",b.brandName),console.log("✓ Название бренда импортировано")}catch(a){console.warn("Ошибка импорта названия бренда:",a)}a(b)}catch(a){b(a)}},d.onerror=()=>b(Error("Ошибка при чтении файла")),d.readAsText(c)});if(b=(0,d.Sb)(),E(b),G(b),(0,f.updatePresetSizesFromConfig)(),a.defaultValues&&(0,f.batch)(()=>{Object.keys(a.defaultValues).forEach(b=>{(0,f.setKey)(b,a.defaultValues[b])})}),a.theme){let b=document.documentElement;"light"===a.theme?b.setAttribute("data-theme","light"):b.removeAttribute("data-theme"),localStorage.setItem("theme",a.theme)}a.brandName&&((0,f.setKey)("brandName",a.brandName),document.title="AI-Craft"),confirm("Конфигурация успешно импортирована! Для полного применения изменений рекомендуется перезагрузить страницу. Перезагрузить сейчас?")?window.location.reload():alert("Конфигурация импортирована. Некоторые изменения могут потребовать перезагрузки страницы.")}catch(a){console.error("Ошибка импорта полной конфигурации:",a),alert(`Ошибка импорта: ${a.message}`)}a.target.value=""}}),document.getElementById("sizesAdminFullReset").addEventListener("click",()=>{if(confirm("⚠️ ВНИМАНИЕ! Вы собираетесь полностью сбросить ВСЕ настройки, связанные с Практикумом:\n\n• Все логотипы и фотографии\n• Все тексты (заголовки, подзаголовки, юридический текст)\n• Все значения по умолчанию\n• Все размеры и платформы\n• Все настройки админки\n\nЭто действие НЕЛЬЗЯ отменить!\n\nПродолжить?")&&confirm("⚠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!\n\nВы точно уверены, что хотите полностью сбросить все настройки?\n\nВсе ваши настройки будут безвозвратно удалены и возвращены к исходным значениям.\n\nНажмите OK для подтверждения или Отмена для отмены."))try{localStorage.removeItem("sizes-config"),localStorage.removeItem((0,e.N5)("default-values")),localStorage.removeItem("format-multipliers"),localStorage.removeItem("adminBackgrounds"),localStorage.removeItem("brandName"),(0,d.m2)(),(0,f.resetState)(),(0,f.updatePresetSizesFromConfig)(),console.log("✓ Все настройки сброшены"),alert("Все настройки успешно сброшены! Страница будет перезагружена."),window.location.reload()}catch(a){console.error("Ошибка при полном сбросе:",a),alert(`Ошибка при сбросе настроек: ${a.message}`)}})},H=()=>{let a=(0,f.getState)(),b=document.getElementById("defaultBgPreview"),c=document.getElementById("defaultBgPreviewImg"),d=document.getElementById("defaultBgPreviewPlaceholder"),e=document.getElementById("defaultBgColorReset");b&&c&&d&&(a.bgImage?(c.src=a.bgImage,c.style.display="block",d.textContent="Изображение"):(c.style.display="none",b.style.background=a.bgColor||"#1e1e1e",d.textContent="Цвет: "+(a.bgColor||"#1e1e1e")),e&&v&&(e.style.display=a.bgColor!==v.bgColor?"block":"none"))},I=()=>{let a=document.getElementById("defaultPartnerLogoPreview");a&&a.addEventListener("click",a=>{a.stopPropagation()});let b=document.getElementById("defaultBgUpload"),c=document.getElementById("defaultBgUploadFile");b&&c&&(b.addEventListener("click",()=>{c.click()}),c.addEventListener("change",async a=>{if(a.target.files[0]){let b={target:a.target};await (0,j.tE)(b),H();let c=document.getElementById("defaultBgClear");c&&(c.style.display="block")}}));let d=document.getElementById("defaultBgClear");d&&d.addEventListener("click",()=>{(0,f.setKey)("bgImage",null),H(),d.style.display="none"});let e=document.getElementById("defaultBgColorReset");e&&e.addEventListener("click",()=>{if(v){(0,f.setKey)("bgColor",v.bgColor);let a=document.getElementById("defaultBgColor"),b=document.getElementById("defaultBgColorHex");a&&(a.value=v.bgColor),b&&(b.value=v.bgColor),H(),e.style.display="none"}});let g=document.getElementById("defaultBgColor"),i=document.getElementById("defaultBgColorHex");g&&i&&(g.addEventListener("input",a=>{let b=a.target.value;(0,f.setKey)("bgColor",b),i.value=b,H(),h.renderer.render(),e&&v&&(e.style.display=b!==v.bgColor?"block":"none")}),i.addEventListener("change",a=>{let b=a.target.value;/^#[0-9A-F]{6}$/i.test(b)&&((0,f.setKey)("bgColor",b),g.value=b,H(),h.renderer.render(),e&&v&&(e.style.display=b!==v.bgColor?"block":"none"))}));let k=document.getElementById("defaultTextColor"),l=document.getElementById("defaultTextColorHex"),m=document.getElementById("defaultTextColorReset");k&&l&&(k.addEventListener("input",a=>{let b=a.target.value;(0,f.setKey)("titleColor",b),l.value=b,m&&v&&(m.style.display=b!==v.titleColor?"block":"none")}),l.addEventListener("change",a=>{let b=a.target.value;/^#[0-9A-F]{6}$/i.test(b)&&((0,f.setKey)("titleColor",b),k.value=b,m&&v&&(m.style.display=b!==v.titleColor?"block":"none"))})),m&&m.addEventListener("click",()=>{v&&((0,f.setKey)("titleColor",v.titleColor),k&&(k.value=v.titleColor),l&&(l.value=v.titleColor),m.style.display="none")});let n=document.getElementById("defaultTitle");n&&n.addEventListener("input",a=>{(0,f.setKey)("title",a.target.value),h.renderer.render()});let o=document.getElementById("defaultSubtitle");o&&o.addEventListener("input",a=>{(0,f.setKey)("subtitle",a.target.value),h.renderer.render()});let p=document.getElementById("defaultLegal");p&&p.addEventListener("input",a=>{(0,f.setKey)("legal",a.target.value),h.renderer.render()});let q=document.getElementById("defaultAge");q&&q.addEventListener("input",a=>{(0,f.setKey)("age",a.target.value),h.renderer.render()});let r=document.getElementById("defaultTitleSize");r&&r.addEventListener("input",a=>{let b=(0,f.getDefaultValues)();(0,f.setKey)("titleSize",parseFloat(a.target.value)||b.titleSize);let c=(0,f.getState)(),d=c.titleSubtitleRatio??b.titleSubtitleRatio,e=parseFloat((c.titleSize*d).toFixed(2));(0,f.setKey)("subtitleSize",e),h.renderer.render()});let s=document.getElementById("defaultTitleWeight");s&&s.addEventListener("change",a=>{(0,f.setKey)("titleWeight",a.target.value),h.renderer.render()});let t=document.getElementById("defaultTitleAlign");t&&t.addEventListener("change",a=>{(0,f.setKey)("titleAlign",a.target.value),h.renderer.render()});let u=document.getElementById("defaultTitleVPos");u&&u.addEventListener("change",a=>{(0,f.setKey)("titleVPos",a.target.value),h.renderer.render()});let w=document.getElementById("defaultTitleLetterSpacing");w&&w.addEventListener("input",a=>{(0,f.setKey)("titleLetterSpacing",parseFloat(a.target.value)||0),h.renderer.render()});let x=document.getElementById("defaultTitleLineHeight");x&&x.addEventListener("input",a=>{(0,f.setKey)("titleLineHeight",parseFloat(a.target.value)||1.1),h.renderer.render()});let y=document.getElementById("defaultSubtitleColor"),z=document.getElementById("defaultSubtitleColorHex");y&&z&&(y.addEventListener("input",a=>{let b=a.target.value;(0,f.setKey)("subtitleColor",b),z.value=b,h.renderer.render()}),z.addEventListener("change",a=>{let b=a.target.value;/^#[0-9A-F]{6}$/i.test(b)&&((0,f.setKey)("subtitleColor",b),y.value=b,h.renderer.render())}));let A=document.getElementById("defaultSubtitleOpacity");A&&A.addEventListener("input",a=>{(0,f.setKey)("subtitleOpacity",parseInt(a.target.value)||90),h.renderer.render()});let B=document.getElementById("defaultTitleSubtitleRatio");B&&B.addEventListener("input",a=>{let b=parseFloat(a.target.value)||.5,c=document.getElementById("defaultTitleSubtitleRatioValue");c&&(c.textContent=b.toFixed(2)),(0,f.setKey)("titleSubtitleRatio",b);let d=parseFloat(((0,f.getState)().titleSize*b).toFixed(2));(0,f.setKey)("subtitleSize",d),h.renderer.render()});let C=document.getElementById("defaultSubtitleSize");C&&C.addEventListener("input",a=>{(0,f.setKey)("subtitleSize",parseFloat(a.target.value)||4),h.renderer.render()});let D=document.getElementById("defaultSubtitleWeight");D&&D.addEventListener("change",a=>{(0,f.setKey)("subtitleWeight",a.target.value),h.renderer.render()});let E=document.getElementById("defaultSubtitleAlign");E&&E.addEventListener("change",a=>{(0,f.setKey)("subtitleAlign",a.target.value),h.renderer.render()});let F=document.getElementById("defaultSubtitleGap");F&&F.addEventListener("input",a=>{(0,f.setKey)("subtitleGap",parseFloat(a.target.value)||-1),h.renderer.render()});let G=document.getElementById("defaultSubtitleLetterSpacing");G&&G.addEventListener("input",a=>{(0,f.setKey)("subtitleLetterSpacing",parseFloat(a.target.value)||0),h.renderer.render()});let I=document.getElementById("defaultSubtitleLineHeight");I&&I.addEventListener("input",a=>{(0,f.setKey)("subtitleLineHeight",parseFloat(a.target.value)||1.2),h.renderer.render()});let J=document.getElementById("defaultLegalColor"),L=document.getElementById("defaultLegalColorHex");J&&L&&(J.addEventListener("input",a=>{let b=a.target.value;(0,f.setKey)("legalColor",b),L.value=b,h.renderer.render()}),L.addEventListener("change",a=>{let b=a.target.value;/^#[0-9A-F]{6}$/i.test(b)&&((0,f.setKey)("legalColor",b),J.value=b,h.renderer.render())}));let M=document.getElementById("defaultLegalOpacity");M&&M.addEventListener("input",a=>{(0,f.setKey)("legalOpacity",parseInt(a.target.value)||60),h.renderer.render()});let N=document.getElementById("defaultLegalSize");N&&N.addEventListener("input",a=>{(0,f.setKey)("legalSize",parseFloat(a.target.value)||2),h.renderer.render()});let O=document.getElementById("defaultLegalWeight");O&&O.addEventListener("change",a=>{(0,f.setKey)("legalWeight",a.target.value),h.renderer.render()});let P=document.getElementById("defaultLegalAlign");P&&P.addEventListener("change",a=>{(0,f.setKey)("legalAlign",a.target.value),h.renderer.render()});let Q=document.getElementById("defaultLegalLetterSpacing");Q&&Q.addEventListener("input",a=>{(0,f.setKey)("legalLetterSpacing",parseFloat(a.target.value)||0),h.renderer.render()});let R=document.getElementById("defaultLegalLineHeight");R&&R.addEventListener("input",a=>{(0,f.setKey)("legalLineHeight",parseFloat(a.target.value)||1.4),h.renderer.render()});let S=document.getElementById("defaultAgeSize");S&&S.addEventListener("input",a=>{(0,f.setKey)("ageSize",parseFloat(a.target.value)||4),h.renderer.render()});let T=document.getElementById("defaultAgeWeight");T&&T.addEventListener("change",a=>{(0,f.setKey)("ageWeight",a.target.value),h.renderer.render()});let U=document.getElementById("defaultAgeGapPercent");U&&U.addEventListener("input",a=>{(0,f.setKey)("ageGapPercent",parseFloat(a.target.value)||1),h.renderer.render()});let V=document.getElementById("defaultPaddingPercent");V&&V.addEventListener("input",a=>{(0,f.setKey)("paddingPercent",parseFloat(a.target.value)||5),h.renderer.render()});let W=document.getElementById("defaultLayoutMode");W&&W.addEventListener("change",a=>{(0,f.setKey)("layoutMode",a.target.value),h.renderer.render()});let X=document.getElementById("defaultBgSize");if(X){let a=document.getElementById("bgImageSizeGroup");if(a){let b=X.value;"tile"===b||"cover"===b||"contain"===b?a.style.display="block":a.style.display="none"}X.addEventListener("change",a=>{let b=a.target.value;(0,f.setKey)("bgSize",b);let c=document.getElementById("bgImageSizeGroup");c&&("tile"===b||"cover"===b||"contain"===b?c.style.display="block":c.style.display="none"),h.renderer.render()})}let Y=document.getElementById("defaultBgImageSize"),Z=document.getElementById("defaultBgImageSizeValue");Y&&Y.addEventListener("input",a=>{let b=parseFloat(a.target.value)||100;(0,f.setKey)("bgImageSize",b),Z&&(Z.textContent=`${Math.round(b)}%`),h.renderer.render()});let $=document.getElementById("defaultBgPosition");$&&$.addEventListener("change",a=>{(0,f.setKey)("bgPosition",a.target.value),h.renderer.render()});let _=document.getElementById("defaultBgVPosition");_&&_.addEventListener("change",a=>{(0,f.setKey)("bgVPosition",a.target.value),h.renderer.render()});let aa=document.getElementById("defaultTextGradientOpacity");aa&&aa.addEventListener("input",a=>{(0,f.setKey)("textGradientOpacity",parseInt(a.target.value)||100),h.renderer.render()});let ab=document.getElementById("defaultCenterTextOverlayOpacity");ab&&ab.addEventListener("input",a=>{(0,f.setKey)("centerTextOverlayOpacity",parseInt(a.target.value)||20),h.renderer.render()});let ac=document.getElementById("defaultMaxFileSizeValue");ac&&ac.addEventListener("input",a=>{(0,f.setKey)("maxFileSizeValue",parseFloat(a.target.value)||150)});let ad=document.getElementById("defaultMaxFileSizeUnit");ad&&ad.addEventListener("change",a=>{(0,f.setKey)("maxFileSizeUnit",a.target.value)});let ae=document.getElementById("defaultHabrBorderEnabled");ae&&ae.addEventListener("change",a=>{(0,f.setKey)("habrBorderEnabled",a.target.checked)});let af=document.getElementById("defaultHabrBorderColor"),ag=document.getElementById("defaultHabrBorderColorHex");af&&ag&&(af.addEventListener("input",a=>{let b=a.target.value;(0,f.setKey)("habrBorderColor",b),ag.value=b}),ag.addEventListener("change",a=>{let b=a.target.value;/^#[0-9A-F]{6}$/i.test(b)&&((0,f.setKey)("habrBorderColor",b),af.value=b)})),K()},J=()=>{let a=(0,f.getState)(),b=a=>{if(!a||"object"!=typeof a)return a;let b=JSON.parse(JSON.stringify(a));return Object.keys(b).forEach(a=>{let c=b[a];c&&"object"==typeof c&&Object.keys(c).forEach(a=>{let b=c[a];if(null==b)return;let d=Number.parseFloat(b);if(!Number.isFinite(d)||d<=0)return void delete c[a];c[a]=Math.min(10,Math.max(.1,d))})}),b},c=a.formatMultipliers;if(!c)try{let a=localStorage.getItem("format-multipliers");a&&(c=b(JSON.parse(a)),(0,f.setKey)("formatMultipliers",JSON.parse(JSON.stringify(c))))}catch(a){console.warn("Ошибка при загрузке множителей из localStorage:",a)}if(c){let a=b(c);c=a,(0,f.setKey)("formatMultipliers",JSON.parse(JSON.stringify(a)))}else c={vertical:{logo:2,title:1,subtitle:1,legal:1,age:1},ultraWide:{logo:.75,titleSmall:3,titleMedium:2.2,titleLarge:2,subtitleSmall:3,subtitleMedium:2.2,subtitleLarge:2,legalNormal:2.5,legalMedium:2,age:2},veryWide:{logo:.75,titleMedium:2.2,titleLarge:2,titleExtraLarge:2,subtitleMedium:2.2,subtitleLarge:2,subtitleExtraLarge:2,legalNormal:2.5,legalMedium:2,legalExtraLarge:2.5,age:2},horizontal:{logo:.75,titleSmall:1.8,titleLarge:1.6,titleWideSmall:1.2,titleWideMedium:1.4,subtitleSmall:1.8,subtitleLarge:1.6,subtitleWideSmall:1.2,subtitleWideMedium:1.4,legalSmall:1.8,legalLarge:2,legalWide450:1.2,legalWide500:1.1,legalWideOther:1.15,age:2,ageWide:null},square:{title:.9,subtitle:.9},tall:{title:1.3,subtitle:1.3}},(0,f.setKey)("formatMultipliers",JSON.parse(JSON.stringify(c)));let d=(a,b,d)=>{let e=JSON.parse(JSON.stringify((0,f.getState)().formatMultipliers||{}));e[a]||(e[a]={});let g=Number.parseFloat(d);if(!Number.isFinite(g))return;let i=Math.min(10,Math.max(.1,g));e[a][b]=i,(0,f.setState)({formatMultipliers:e}),c=e,setTimeout(()=>{let c=(0,f.getState)();console.log("Множители после обновления:",c.formatMultipliers?.[a]?.[b]),h.renderer.render()},50)};["logo","title","subtitle","legal","age"].forEach(a=>{let b=document.getElementById(`multiplier-vertical-${a}`);b&&b.addEventListener("input",b=>{d("vertical",a,b.target.value)})}),["logo","titleSmall","titleMedium","titleLarge","subtitleSmall","subtitleMedium","subtitleLarge","legalNormal","legalMedium","age"].forEach(a=>{let b=document.getElementById(`multiplier-ultraWide-${a}`);b&&b.addEventListener("input",b=>{d("ultraWide",a,b.target.value)})}),["logo","titleMedium","titleLarge","titleExtraLarge","subtitleMedium","subtitleLarge","subtitleExtraLarge","legalNormal","legalMedium","legalExtraLarge","age"].forEach(a=>{let b=document.getElementById(`multiplier-veryWide-${a}`);b&&b.addEventListener("input",b=>{d("veryWide",a,b.target.value)})}),["logo","titleSmall","titleLarge","titleWideSmall","titleWideMedium","subtitleSmall","subtitleLarge","subtitleWideSmall","subtitleWideMedium","legalSmall","legalLarge","legalWide450","legalWide500","legalWideOther","age"].forEach(a=>{let b=document.getElementById(`multiplier-horizontal-${a}`);b&&b.addEventListener("input",b=>{d("horizontal",a,b.target.value)})});let e=document.getElementById("multiplier-square-title");e&&e.addEventListener("input",a=>{d("square","title",a.target.value)});let g=document.getElementById("multiplier-square-subtitle");g&&g.addEventListener("input",a=>{d("square","subtitle",a.target.value)});let i=document.getElementById("multiplier-tall-title");i&&i.addEventListener("input",a=>{d("tall","title",a.target.value)});let j=document.getElementById("multiplier-tall-subtitle");j&&j.addEventListener("input",a=>{d("tall","subtitle",a.target.value)})},K=()=>{let a=a=>{localStorage.setItem("adminBackgrounds",JSON.stringify(a))},b=()=>JSON.parse(localStorage.getItem("adminBackgrounds")||"[]"),d=a=>{let b=a.replace("#",""),c=parseInt(b.substr(0,2),16),d=(.299*c+.587*parseInt(b.substr(2,2),16)+.114*parseInt(b.substr(4,2),16))/255,e="#ffffff",f="white";return"#FF6C26"===a||"#E84033"===a?(e="#ffffff",f="white"):(e=d>.5?"#1e1e1e":"#ffffff",f=d>.5?"black":"white"),{bgColor:a,bgImage:null,textColor:e,logoFolder:f}};window.refreshBackgroundsList=()=>{let a=s.querySelector("#adminBackgroundsList");if(a){let b=JSON.parse(localStorage.getItem("adminBackgrounds")||"[]"),c=b.map(a=>a.bgColor?.toUpperCase()).filter(Boolean),e=l.uO.filter(a=>!c.includes(a.toUpperCase()));e.length>0&&(b=[...b,...e.map(a=>d(a))],localStorage.setItem("adminBackgrounds",JSON.stringify(b))),0===b.length&&(b=l.uO.map(a=>d(a)),localStorage.setItem("adminBackgrounds",JSON.stringify(b)));let f=getComputedStyle(document.documentElement).getPropertyValue("--border-color")||"#2a2a2a",g=getComputedStyle(document.documentElement).getPropertyValue("--bg-primary")||"#0d0d0d",h=getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9",i=getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999";a.innerHTML=b.map((a,b)=>`
        <div class="admin-background-item" data-bg-index="${b}" style="border: 1px solid ${f}; border-radius: 8px; padding: 16px; background: ${g};">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 60px; height: 60px; border-radius: 8px; background: ${a.bgColor||"#1e1e1e"}; border: 1px solid ${f}; position: relative; overflow: hidden;">
                ${a.bgImage?`<img src="${a.bgImage}" style="width: 100%; height: 100%; object-fit: cover;">`:""}
              </div>
              <div>
                <div style="font-weight: 600; color: ${h}; margin-bottom: 4px;">Фон #${b+1}</div>
                <div style="font-size: 12px; color: ${i};">
                  ${a.bgImage?"Изображение":`Цвет: ${a.bgColor||"#1e1e1e"}`}
                </div>
              </div>
            </div>
            <button class="btn btn-danger" data-remove-bg="${b}" style="padding: 8px;">
              <span class="material-icons" style="font-size: 18px;">delete</span>
            </button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Фон</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="color" class="admin-bg-color" data-bg-index="${b}" value="${a.bgColor||"#1e1e1e"}" style="width: 60px; height: 40px; border: 1px solid ${f}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-bg-color-hex" data-bg-index="${b}" value="${a.bgColor||"#1e1e1e"}" placeholder="#1e1e1e" style="flex: 1; padding: 8px; border: 1px solid ${f}; border-radius: 8px; background: ${g}; color: ${h}; font-family: inherit; font-size: 14px;">
              </div>
              <button class="btn" data-upload-bg="${b}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>
                Загрузить изображение
              </button>
              <input type="file" class="admin-bg-upload-file" data-bg-index="${b}" accept="image/*" style="display: none;">
              <button class="btn" data-select-bg="${b}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">image</span>
                Выбрать из библиотеки
              </button>
              ${a.bgImage?`<button class="btn btn-danger" data-clear-bg="${b}" style="width: 100%;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">delete</span>
                Удалить изображение
              </button>`:""}
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Цвет текста</label>
              <div style="display: flex; gap: 8px;">
                <input type="color" class="admin-text-color" data-bg-index="${b}" value="${a.textColor||"#ffffff"}" style="width: 60px; height: 40px; border: 1px solid ${f}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-text-color-hex" data-bg-index="${b}" value="${a.textColor||"#ffffff"}" placeholder="#ffffff" style="flex: 1; padding: 8px; border: 1px solid ${f}; border-radius: 8px; background: ${g}; color: ${h}; font-family: inherit; font-size: 14px;">
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Логотип</label>
              <select class="admin-logo-folder" data-bg-index="${b}" style="width: 100%; padding: 8px; border: 1px solid ${f}; border-radius: 8px; background: ${g}; color: ${h}; font-family: inherit; font-size: 14px;">
                <option value="white" ${"white"===a.logoFolder?"selected":""}>Белый</option>
                <option value="black" ${"black"===a.logoFolder||!a.logoFolder?"selected":""}>Черный</option>
              </select>
            </div>
          </div>
        </div>
      `).join("")}};let e=s.querySelector("#adminAddBackground");e&&e.addEventListener("click",()=>{let c=b();c.push({bgColor:"#1e1e1e",bgImage:null,textColor:"#ffffff",logoFolder:"white"}),a(c),window.refreshBackgroundsList()}),s.addEventListener("adminBackgroundsUpdated",()=>{window.refreshBackgroundsList()});let g=s.querySelector("#adminBackgroundsList");g&&(g.addEventListener("click",c=>{let d=c.target.closest("[data-remove-bg]");if(d){let c=parseInt(d.dataset.removeBg),e=b();e.splice(c,1),a(e),window.refreshBackgroundsList()}}),g.addEventListener("click",a=>{let b=a.target.closest("[data-upload-bg]");if(b){let a=parseInt(b.dataset.uploadBg),c=s.querySelector(`.admin-bg-upload-file[data-bg-index="${a}"]`);c&&c.click()}let c=a.target.closest("[data-select-bg]");if(c){let a=parseInt(c.dataset.selectBg);window._adminBgSelectIndex=a,(0,k.be)().then(()=>{})}}),g.addEventListener("click",c=>{let d=c.target.closest("[data-clear-bg]");if(d){let c=parseInt(d.dataset.clearBg),e=b();e[c]&&(e[c].bgImage=null,a(e),window.refreshBackgroundsList())}}),g.addEventListener("input",c=>{if(c.target.classList.contains("admin-bg-color")){let d=parseInt(c.target.dataset.bgIndex),e=b();if(e[d]){e[d].bgColor=c.target.value;let b=s.querySelector(`.admin-bg-color-hex[data-bg-index="${d}"]`);b&&(b.value=c.target.value),a(e),window.refreshBackgroundsList(),h.renderer.render()}}else if(c.target.classList.contains("admin-bg-color-hex")){let d=parseInt(c.target.dataset.bgIndex),e=b();if(e[d]&&/^#[0-9A-Fa-f]{6}$/i.test(c.target.value)){e[d].bgColor=c.target.value.toUpperCase();let b=s.querySelector(`.admin-bg-color[data-bg-index="${d}"]`);b&&(b.value=c.target.value),a(e),refreshBackgroundsList(),h.renderer.render()}}else if(c.target.classList.contains("admin-text-color")){let d=parseInt(c.target.dataset.bgIndex),e=b();if(e[d]){e[d].textColor=c.target.value;let b=s.querySelector(`.admin-text-color-hex[data-bg-index="${d}"]`);b&&(b.value=c.target.value),a(e),refreshBackgroundsList()}}else if(c.target.classList.contains("admin-text-color-hex")){let d=parseInt(c.target.dataset.bgIndex),e=b();if(e[d]&&/^#[0-9A-Fa-f]{6}$/i.test(c.target.value)){e[d].textColor=c.target.value.toUpperCase();let b=s.querySelector(`.admin-text-color[data-bg-index="${d}"]`);b&&(b.value=c.target.value),a(e),refreshBackgroundsList()}}else if(c.target.classList.contains("admin-logo-folder")){let d=parseInt(c.target.dataset.bgIndex),e=b();e[d]&&(e[d].logoFolder=c.target.value,a(e))}}),g.addEventListener("change",c=>{if(c.target.classList.contains("admin-bg-upload-file")){let d=parseInt(c.target.dataset.bgIndex),e=c.target.files[0];if(e){let c=new FileReader;c.onload=c=>{let e=b();e[d]&&(e[d].bgImage=c.target.result,a(e),window.refreshBackgroundsList())},c.readAsDataURL(e)}}}),g.addEventListener("dblclick",async a=>{let d=a.target.closest(".admin-background-item");if(d){let a=parseInt(d.dataset.bgIndex),e=b()[a];if(e)if(e.bgImage){let a=new Image;a.crossOrigin="anonymous",a.onload=async()=>{let b=(0,f.getState)().activePairIndex||0,{updatePairBgImage:d}=await Promise.resolve().then(c.bind(c,3590));d(b,a),(0,f.setState)({bgImage:a}),await j(e)},a.src=e.bgImage}else{let a=e.bgColor?.toUpperCase()||e.bgColor;(0,f.setKey)("bgColor",a);let b=(0,f.getState)().activePairIndex||0,{updatePairBgColor:d}=await Promise.resolve().then(c.bind(c,3590));d(b,a);let g=(0,n.j)();g.bgColor&&(g.bgColor.value=a),g.bgColorHex&&(g.bgColorHex.value=a),await j(e)}}}));let j=async a=>{let b=a.textColor||"#ffffff";(0,f.setKey)("titleColor",b);let c=(0,n.j)();c.titleColor&&(c.titleColor.value=b),c.titleColorHex&&(c.titleColorHex.value=b);let d=(0,f.getState)().logoLanguage||"ru",e="main.svg",g=a.bgColor?.toUpperCase();("#E84033"===g||"#FF6C26"===g)&&(e="mono.svg");let j=`logo/${a.logoFolder||"white"}/${d}/${e}`;(0,f.setKey)("logoSelected",j),await (0,i.sn)(j),h.renderer.render()}},L=()=>{s.querySelectorAll(".admin-accordion-header").forEach(a=>{a.addEventListener("click",()=>{let b=a.dataset.accordionToggle,c=s.querySelector(`.admin-accordion-section[data-section="${b}"]`),d=c?.querySelector(".admin-accordion-content"),e=a.querySelector(".admin-accordion-icon");if(d){if("none"!==d.style.display)d.style.display="none",e&&(e.style.transform="rotate(0deg)");else if(d.style.display="block",e&&(e.style.transform="rotate(180deg)"),"multipliers"===b||"backgrounds"===b||"files"===b)try{let a="";"multipliers"===b?a=y():"backgrounds"===b?a=z():"files"===b&&(a=renderFileManager()),a&&(d.innerHTML=a,"backgrounds"===b?requestAnimationFrame(()=>{"function"==typeof window.refreshBackgroundsList&&window.refreshBackgroundsList(),K()}):"files"===b?requestAnimationFrame(()=>{initFileManager()}):"multipliers"===b&&requestAnimationFrame(()=>{J()}))}catch(a){console.error("Ошибка при перерендеринге раздела:",a),d.innerHTML=`<div style="padding: 20px; color: red;">Ошибка загрузки: ${a.message}</div>`}}})}),s.querySelectorAll(".size-settings-header").forEach(a=>{a.addEventListener("click",()=>{let b=a.nextElementSibling,c=a.querySelector(".size-settings-icon");b&&("none"!==b.style.display?(b.style.display="none",c&&(c.style.transform="rotate(0deg)")):(b.style.display="block",c&&(c.style.transform="rotate(180deg)")))})}),s.querySelectorAll(".sizes-admin-menu-item").length>0&&console.warn("Найдены старые элементы меню, но они больше не используются")}}};