"use strict";exports.id=462,exports.ids=[462],exports.modules={2462:(a,b,c)=>{c.r(b),c.d(b,{showLogoAssetsAdmin:()=>O});var d=c(857),e=c(7549);let f=async()=>{let a=await (0,e.BS)(),b=a?.remote;if(!b?.enabled||!b.manifestUrl)throw Error("Remote media source is not configured");return b},g=async a=>{try{let b=await a.json();return b?.error||b?.message||`HTTP ${a.status}`}catch{return`HTTP ${a.status}`}},h=a=>{let b={Accept:"application/json"};return void 0!==a&&(b["Content-Type"]="text/plain;charset=UTF-8"),b},i=async()=>(a=>{if(!a||"string"!=typeof a)return"";try{let b=new URL(a,window.location.origin),c=b.pathname.replace(/\/media\/manifest\/?$/,"");return`${b.origin}${c}`}catch{return""}})((await f()).manifestUrl),j=async()=>{let a=await (0,e.BS)();return a?.remote?.enabled===!0&&!!a?.remote?.manifestUrl},k=async({folder1:a,folder2:b,filename:c,contentType:d,fileSize:e,visibility:f="published"})=>{let j=await i();if(!j)throw Error("Remote media API base URL is missing");let k=await fetch(`${j}/media/presign-upload`,{method:"POST",headers:h(!0),body:JSON.stringify({folder1:a,folder2:b,filename:c,contentType:d,fileSize:e,visibility:f})});if(!k.ok)throw Error(await g(k));return k.json()},l=async({file:a,folder1:b,folder2:c,visibility:d="published"})=>{if(!(a instanceof File))throw Error("uploadRemoteFile expects a File instance");let e=await k({folder1:b,folder2:c,filename:a.name,contentType:a.type||"application/octet-stream",fileSize:a.size,visibility:d}),f=await fetch(e.uploadUrl,{method:e.method||"PUT",headers:e.headers||{},body:a});if(!f.ok)throw Error(`Remote upload failed: HTTP ${f.status}`);return e},m=async(a,{method:b="GET",body:c}={})=>{let d=await i();if(!d)throw Error("Remote media API base URL is missing");let e=await fetch(`${d}${a}`,{method:b,headers:h(c),body:c?JSON.stringify(c):void 0});if(!e.ok)throw Error(await g(e));return e.json()},n=async({key:a})=>{if(!a||"string"!=typeof a)throw Error("deleteRemoteObject requires a key");return m("/media/object",{method:"DELETE",body:{key:a}})},o=async({key:a,visibility:b="published"})=>{if(!a||"string"!=typeof a)throw Error("publishRemoteObject requires a key");return m("/media/publish",{method:"POST",body:{key:a,visibility:b}})},p=a=>"string"==typeof a&&/^(https?:)?\/\//i.test(a),q=a=>{if("string"!=typeof a)return null;let b=a.trim().replace(/^\/+|\/+$/g,"");if(!b.startsWith("assets/"))return null;let c=b.split("/");if(3!==c.length)return null;let[,d,e]=c;return d&&e?{folder1:d,folder2:e}:null},r=a=>{let b=(a=>"string"!=typeof a?"":a.trim().replace(/^\/+|\/+$/g,""))(a);if(!b.startsWith("assets/"))return"";let c=b.split("/").filter(Boolean);return"assets"!==c[0]?"":2===c.length&&c[1]?`assets/${c[1]}`:3===c.length&&c[1]&&c[2]?`assets/${c[1]}/${c[2]}`:""},s=()=>[],t=a=>{},u=a=>{let b=r(a);if(!b)return[];let c=Array.from(new Set([...s(),b])).sort();return t(c),c},v=a=>{let b="string"==typeof a?.name?a.name.trim():"",c=(a=>{let b=(a=>{if("string"!=typeof a||!a.trim())return[];let b=a.trim(),c=b.split("?")[0];if(!p(b))return c.split("/").filter(Boolean);try{return new URL(b,window.location.origin).pathname.split("/").filter(Boolean)}catch{return c.split("/").filter(Boolean)}})(a);return b.length>0?b[b.length-1]:""})(a?.file);if(b&&/\.[a-z0-9]{2,5}$/i.test(b))return b;if(c){if(b&&!/\.[a-z0-9]{2,5}$/i.test(b)){let a=c.match(/(\.[a-z0-9]{2,5})$/i);if(a)return`${b}${a[1]}`}return c}return b||"file"},w={async uploadFile(a,b){let c=await j().catch(()=>!1)?q(b):null;if(c)return l({file:a,folder1:c.folder1,folder2:c.folder2,visibility:"published"});let d=await a.arrayBuffer(),e=`/api/upload?path=${encodeURIComponent(b)}&filename=${encodeURIComponent(a.name)}`,f=await fetch(e,{method:"POST",headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename="${encodeURIComponent(a.name)}"`},body:d});if(!f.ok)throw Error(await f.text()||"Upload failed");return await f.json()},async createFolder(a,b){if(!b||"string"!=typeof b)throw Error("Invalid target path");let c=`/api/create-folder?path=${encodeURIComponent(b)}&name=${encodeURIComponent(a)}`,d=await fetch(c,{method:"POST"});if(!d.ok){let a="Create folder failed";try{a=await d.text()||a}catch(b){a=`Create folder failed (${d.status})`}throw Error(a)}return await d.json()},async deleteFile(a){let b=`/api/file?path=${encodeURIComponent(a)}`,c=await fetch(b,{method:"DELETE"});if(!c.ok)throw Error(await c.text()||"Delete file failed");return await c.json()},async deleteFolder(a){let b=`/api/folder?path=${encodeURIComponent(a)}`,c=await fetch(b,{method:"DELETE"});if(!c.ok)throw Error(await c.text()||"Delete folder failed");return await c.json()},async renameFolder(a,b){let c=`/api/rename-folder?path=${encodeURIComponent(a)}&name=${encodeURIComponent(b)}`,d=await fetch(c,{method:"POST"});if(!d.ok)throw Error(await d.text()||"Rename folder failed");return await d.json()}};async function x(a){return"logo"===a?await (0,d.aY)():"assets"===a?await (0,d.HH)():{}}var y=c(3590),z=c(5107),A=c(8813),B=c(7627),C=c(7072),D=c(7326),E=c(6879),F=c(8976),G=c(7704);let H=null,I=!1,J=!1,K=()=>{let a=(0,y.getState)(),b=(0,y.getDefaultValues)(),c=document.getElementById("logoAssetsDefaultLogoPreviewImg"),d=document.getElementById("logoAssetsDefaultLogoPreviewPlaceholder"),e=document.getElementById("logoAssetsDefaultLogoClear");c&&d&&(a.logoSelected&&a.logoSelected!==b.logoSelected?(c.src=a.logoSelected,c.style.display="block",d.style.display="none",e&&(e.style.display="block")):(c.style.display="none",d.style.display="block",e&&(e.style.display="none")));let f=document.getElementById("logoAssetsDefaultKVPreviewImg"),g=document.getElementById("logoAssetsDefaultKVPreviewPlaceholder"),h=document.getElementById("logoAssetsDefaultKVClear");f&&g&&(a.kvSelected&&""!==a.kvSelected&&a.kvSelected!==b.kvSelected?(f.src=a.kvSelected,f.style.display="block",g.style.display="none",h&&(h.style.display="block")):(f.src=C.UF,f.style.display="block",g.style.display="none",h&&(h.style.display="none")));let i=document.getElementById("logoAssetsVariantRuPreviewImg"),j=document.getElementById("logoAssetsVariantRuPlaceholder");if(i&&j){let b=a.defaultLogoRU||a.logoSelected||"";b?(i.src=b,i.style.display="block",j.style.display="none"):(i.style.display="none",j.style.display="flex")}let k=document.getElementById("logoAssetsVariantKzPreviewImg"),l=document.getElementById("logoAssetsVariantKzPlaceholder");if(k&&l){let b=a.defaultLogoKZ||"";b?(k.src=b,k.style.display="block",l.style.display="none"):(k.style.display="none",l.style.display="flex")}let m=document.getElementById("logoAssetsVariantProPreviewImg"),n=document.getElementById("logoAssetsVariantProPlaceholder");if(m&&n){let b=a.defaultLogoPRO||"";b?(m.src=b,m.style.display="block",n.style.display="none"):(m.style.display="none",n.style.display="flex")}};window.updateLogoAssetsPreview=K;let L=async()=>{if(console.log("openLogoAssetsAdmin вызвана, isAdminOpen:",I),I)return void console.log("Админка уже открыта, выходим");I=!0,console.log("Создаем модальное окно админки...");let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",d=a.getPropertyValue("--bg-secondary")||"#141414",e=a.getPropertyValue("--border-color")||"#2a2a2a",f=a.getPropertyValue("--text-primary")||"#e9e9e9",g=a.getPropertyValue("--text-secondary")||"#999999",h=(0,y.getState)(),i=(0,y.getDefaultValues)(),k=!!(h.logoSelected&&h.logoSelected!==i.logoSelected),l=!!(h.kvSelected&&h.kvSelected!==i.kvSelected),m=(a,b)=>{let c=parseInt(a.slice(1,3),16),d=parseInt(a.slice(3,5),16),e=parseInt(a.slice(5,7),16);return`rgba(${c}, ${d}, ${e}, ${b})`},z="#AA96DA",A="#FCBAD3";(H=document.createElement("div")).id="logoAssetsAdminModal",H.className="logo-assets-admin-overlay",H.style.cssText=`
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
    padding: 20px;
    box-sizing: border-box;
  `,H.innerHTML=`
    <div class="logo-assets-admin-content" style="
      background: ${d};
      border: 1px solid ${e};
      border-radius: 12px;
      width: 100%;
      max-width: 1200px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    ">
      <div class="logo-assets-admin-header" style="
        padding: 20px;
        border-bottom: 1px solid ${e};
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        background: ${d};
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="material-icons" style="font-size: 28px; color: #2196F3;">image</span>
          <h2 style="margin: 0; font-size: 20px; color: ${f};">${(0,E.t)("admin.logoAssets.title")}</h2>
        </div>
        <button id="logoAssetsAdminClose" class="btn" style="
          padding: 8px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: ${f};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        " title="${(0,E.t)("admin.logoAssets.close")}">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="logo-assets-admin-body" style="
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <!-- Файловый менеджер -->
        <div class="admin-section-box" style="
          padding: 20px;
          background: ${b};
          border: 1px solid ${e};
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${e};
          ">
            <span class="material-icons" style="color: #FF9800; font-size: 24px;">folder</span>
            <h3 style="margin: 0; color: ${f}; font-size: 18px; font-weight: 600;">${(0,E.t)("admin.logoAssets.fileManager.title")}</h3>
          </div>
          <div id="logoAssetsFileManagerContent">
            ${function(){let a="#2a2a2a",b="#0d0d0d",c="#e9e9e9",d="#999999";try{if("undefined"!=typeof document&&document.documentElement){let e=getComputedStyle(document.documentElement);a=e.getPropertyValue("--border-color").trim()||a,b=e.getPropertyValue("--bg-primary").trim()||b,c=e.getPropertyValue("--text-primary").trim()||c,d=e.getPropertyValue("--text-secondary").trim()||d}}catch(a){console.warn("Не удалось получить CSS переменные, используются значения по умолчанию:",a)}return`
    <div style="display: flex; flex-direction: column; gap: 20px; width: 100%; padding: 20px; min-height: 400px; box-sizing: border-box;">
      <div style="padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">folder</span>
          <div>
            <div style="font-weight: 600; color: ${c}; margin-bottom: 4px; font-size: 16px;">Управление файлами</div>
            <div style="font-size: 13px; color: ${d}; line-height: 1.5;">
              Управляйте папками и файлами в logo и assets. Изображения в assets автоматически конвертируются в WebP с качеством 50%.
            </div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${b}; border: 1px solid ${a}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${a};">
          <span class="material-icons" style="color: #FF9800; font-size: 20px;">image</span>
          <h3 style="margin: 0; color: ${c}; font-size: 18px; font-weight: 600;">Папки</h3>
        </div>
        
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <button class="btn btn-full" id="fileManagerLogoBtn" data-base-path="logo" style="flex: 1; padding: 12px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${a}; border-radius: 6px; color: ${c}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span class="material-icons" style="font-size: 18px;">account_circle</span>
            <span>Логотипы (logo)</span>
          </button>
          <button class="btn btn-full" id="fileManagerAssetsBtn" data-base-path="assets" style="flex: 1; padding: 12px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${a}; border-radius: 6px; color: ${c}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span class="material-icons" style="font-size: 18px;">image</span>
            <span>Ассеты (assets)</span>
          </button>
        </div>
        
        <div id="fileManagerContent" style="display: none;">
          <div id="fileManagerBreadcrumb" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 12px; background: ${b}; border: 1px solid ${a}; border-radius: 6px; flex-wrap: wrap;">
            <button class="btn btn-small" id="fileManagerBackBtn" style="display: none; padding: 4px 8px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${a}; border-radius: 4px; color: ${c}; cursor: pointer;" title="Назад">
              <span class="material-icons" style="font-size: 18px;">arrow_back</span>
            </button>
            <span class="material-icons" style="font-size: 18px; color: ${d};">folder</span>
            <span id="fileManagerCurrentPath" style="color: ${c}; font-size: 14px;"></span>
          </div>
          
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button class="btn" id="fileManagerCreateFolderBtn" style="flex: 1; padding: 10px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${a}; border-radius: 6px; color: ${c}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons" style="font-size: 18px;">create_new_folder</span>
              <span>Создать папку</span>
            </button>
            <button class="btn" id="fileManagerUploadBtn" style="flex: 1; padding: 10px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${a}; border-radius: 6px; color: ${c}; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <span>Загрузить файл</span>
            </button>
            <button class="btn" id="fileManagerRefreshBtn" style="padding: 10px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${a}; border-radius: 6px; color: ${c}; cursor: pointer;">
              <span class="material-icons" style="font-size: 18px;">refresh</span>
            </button>
          </div>
          
          <div id="fileManagerHint" style="display: none; margin-bottom: 16px; padding: 10px 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px; color: ${d}; font-size: 13px; line-height: 1.45;"></div>
          
          <div id="fileManagerTree" style="max-height: 500px; overflow-y: auto; border: 1px solid ${a}; border-radius: 6px; padding: 12px; background: ${b}; min-height: 200px;">
            <!-- Дерево файлов будет отрисовано здесь -->
          </div>
        </div>
      </div>
    </div>
  `}()}
          </div>
        </div>
        
        <!-- Медиа-элементы по умолчанию -->
        <div class="admin-section-box" style="
          padding: 20px;
          background: ${b};
          border: 1px solid ${e};
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${e};
          ">
            <span class="material-icons" style="color: #FF9800; font-size: 24px;">image</span>
            <h3 style="margin: 0; color: ${f}; font-size: 18px; font-weight: 600;">${(0,E.t)("admin.logoAssets.defaults.title")}</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
              <label style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: ${f};">
                <span class="material-icons" style="font-size: 20px; color: ${g};">account_circle</span>
                ${(0,E.t)("admin.logoAssets.defaults.logo")}
              </label>
              <div id="logoAssetsDefaultLogoPreview" class="preview-container">
                <img id="logoAssetsDefaultLogoPreviewImg" src="${h.logoSelected||""}" class="preview-img" style="display: none;">
                <span id="logoAssetsDefaultLogoPreviewPlaceholder" class="preview-placeholder">${(0,E.t)("common.none")}</span>
              </div>
              <div class="input-group" style="display: flex; gap: 8px; margin-top: 8px;">
                <button type="button" class="btn btn-full" id="logoAssetsDefaultLogoSelect" style="flex: 1;">
                  ${(0,E.t)("admin.logoAssets.defaults.select")}
                </button>
                <button type="button" class="btn btn-danger" id="logoAssetsDefaultLogoClear" style="display: ${k?"block":"none"};" title="${(0,E.t)("admin.logoAssets.defaults.reset")}">
                  ${(0,E.t)("admin.logoAssets.defaults.reset")}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: ${f};">
                <span class="material-icons" style="font-size: 20px; color: ${g};">image</span>
                ${(0,E.t)("admin.logoAssets.defaults.kv")}
              </label>
              <div id="logoAssetsDefaultKVPreview" class="preview-container">
                <img id="logoAssetsDefaultKVPreviewImg" src="${h.kvSelected&&""!==h.kvSelected?h.kvSelected:C.UF}" class="preview-img" style="display: ${h.kvSelected?"block":"none"};">
                <span id="logoAssetsDefaultKVPreviewPlaceholder" class="preview-placeholder" style="display: ${h.kvSelected?"none":"block"};">${(0,E.t)("common.none")}</span>
              </div>
              <div class="input-group" style="display: flex; gap: 8px; margin-top: 8px;">
                <button type="button" class="btn btn-full" id="logoAssetsDefaultKVSelect" style="flex: 1;">
                  ${(0,E.t)("admin.logoAssets.defaults.select")}
                </button>
                <button type="button" class="btn btn-danger" id="logoAssetsDefaultKVClear" style="display: ${l?"block":"none"};" title="${(0,E.t)("admin.logoAssets.defaults.reset")}">
                  ${(0,E.t)("admin.logoAssets.defaults.reset")}
                </button>
              </div>
            </div>
            
          </div>
        </div>
        
        <!-- Настройки логотипа -->
        <div class="admin-color-group" style="
          border-left: 4px solid ${z};
          background: ${m(z,.08)};
          padding: 20px;
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${m(z,.3)};
          ">
            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${m(z,.2)}; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons" style="color: ${z}; font-size: 20px;">account_circle</span>
            </div>
            <div>
              <h3 style="margin: 0; color: ${f}; font-size: 18px; font-weight: 600;">${(0,E.t)("admin.logoAssets.logoSettings.title")}</h3>
              <div style="font-size: 12px; color: ${g}; margin-top: 2px;">${(0,E.t)("admin.logoAssets.logoSettings.desc")}</div>
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.logoSettings.modeLabel")}</label>
            <select id="logoAssetsDefaultLogoMode" class="theme-input">
              <option value="single" ${"single"===(h.logoDefaultMode||"single")?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.modeSingle")}</option>
              <option value="perVariant" ${"perVariant"===h.logoDefaultMode?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.modePerVariant")}</option>
            </select>
          </div>
          <div id="logoAssetsLogoModeSingle" style="display: ${"single"===(h.logoDefaultMode||"single")?"block":"none"};">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.logoSettings.size")}</label>
              <input type="number" id="logoAssetsDefaultLogoSize" class="theme-input" value="${h.logoSize??i.logoSize}" step="1" min="10" max="100">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.logoSettings.position")}</label>
              <select id="logoAssetsDefaultLogoPos" class="theme-input">
                <option value="left" ${"left"===h.logoPos||!h.logoPos?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.position.left")}</option>
                <option value="center" ${"center"===h.logoPos?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.position.center")}</option>
                <option value="right" ${"right"===h.logoPos?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.position.right")}</option>
              </select>
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.logoSettings.language")}</label>
              <select id="logoAssetsDefaultLogoLanguage" class="theme-input">
                <option value="ru" ${"ru"===h.logoLanguage||!h.logoLanguage?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.language.ru")}</option>
                <option value="kz" ${"kz"===h.logoLanguage?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.language.kz")}</option>
              </select>
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.logoSettings.proMode")}</label>
              <select id="logoAssetsDefaultProMode" class="theme-input">
                <option value="false" ${!h.proMode?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.proMode.off")}</option>
                <option value="true" ${h.proMode?"selected":""}>${(0,E.t)("admin.logoAssets.logoSettings.proMode.on")}</option>
              </select>
            </div>
          </div>
          </div>
          <div id="logoAssetsLogoModePerVariant" style="display: ${"perVariant"===h.logoDefaultMode?"block":"none"}; margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="form-group" style="padding: 12px; background: ${m(z,.05)}; border-radius: 8px;">
                <label style="font-weight: 600; margin-bottom: 8px; color: ${f};">${(0,E.t)("admin.logoAssets.logoSettings.variant.ru")}</label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div id="logoAssetsVariantRuPreview" class="preview-container" style="width: 80px; height: 40px; min-width: 80px;">
                    <img id="logoAssetsVariantRuPreviewImg" src="${h.defaultLogoRU||h.logoSelected||""}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: ${h.defaultLogoRU||h.logoSelected?"block":"none"};">
                    <span id="logoAssetsVariantRuPlaceholder" class="preview-placeholder" style="display: ${h.defaultLogoRU||h.logoSelected?"none":"flex"};">—</span>
                  </div>
                  <button type="button" class="btn" id="logoAssetsVariantRuSelect">${(0,E.t)("admin.logoAssets.defaults.select")}</button>
                </div>
              </div>
              <div class="form-group" style="padding: 12px; background: ${m(z,.05)}; border-radius: 8px;">
                <label style="font-weight: 600; margin-bottom: 8px; color: ${f};">${(0,E.t)("admin.logoAssets.logoSettings.variant.kz")}</label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div id="logoAssetsVariantKzPreview" class="preview-container" style="width: 80px; height: 40px; min-width: 80px;">
                    <img id="logoAssetsVariantKzPreviewImg" src="${h.defaultLogoKZ||""}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: ${h.defaultLogoKZ?"block":"none"};">
                    <span id="logoAssetsVariantKzPlaceholder" class="preview-placeholder" style="display: ${h.defaultLogoKZ?"none":"flex"};">—</span>
                  </div>
                  <button type="button" class="btn" id="logoAssetsVariantKzSelect">${(0,E.t)("admin.logoAssets.defaults.select")}</button>
                </div>
              </div>
              <div class="form-group" style="padding: 12px; background: ${m(z,.05)}; border-radius: 8px;">
                <label style="font-weight: 600; margin-bottom: 8px; color: ${f};">${(0,E.t)("admin.logoAssets.logoSettings.variant.pro")}</label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div id="logoAssetsVariantProPreview" class="preview-container" style="width: 80px; height: 40px; min-width: 80px;">
                    <img id="logoAssetsVariantProPreviewImg" src="${h.defaultLogoPRO||""}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: ${h.defaultLogoPRO?"block":"none"};">
                    <span id="logoAssetsVariantProPlaceholder" class="preview-placeholder" style="display: ${h.defaultLogoPRO?"none":"flex"};">—</span>
                  </div>
                  <button type="button" class="btn" id="logoAssetsVariantProSelect">${(0,E.t)("admin.logoAssets.defaults.select")}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Настройки Визуал -->
        <div class="admin-color-group" style="
          border-left: 4px solid ${A};
          background: ${m(A,.08)};
          padding: 20px;
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${m(A,.3)};
          ">
            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${m(A,.2)}; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons" style="color: ${A}; font-size: 20px;">image</span>
            </div>
            <div>
              <h3 style="margin: 0; color: ${f}; font-size: 18px; font-weight: 600;">${(0,E.t)("admin.logoAssets.kvSettings.title")}</h3>
              <div style="font-size: 12px; color: ${g}; margin-top: 2px;">${(0,E.t)("admin.logoAssets.kvSettings.desc")}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.kvSettings.borderRadius")}</label>
              <input type="number" id="logoAssetsDefaultKvBorderRadius" class="theme-input" value="${h.kvBorderRadius??i.kvBorderRadius}" step="1" min="0" max="100">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${g}; font-size: 14px;">${(0,E.t)("admin.logoAssets.kvSettings.position")}</label>
              <select id="logoAssetsDefaultKvPosition" class="theme-input">
                <option value="left" ${"left"===h.kvPosition?"selected":""}>${(0,E.t)("admin.logoAssets.kvSettings.position.left")}</option>
                <option value="center" ${"center"===h.kvPosition||!h.kvPosition?"selected":""}>${(0,E.t)("admin.logoAssets.kvSettings.position.center")}</option>
                <option value="right" ${"right"===h.kvPosition?"selected":""}>${(0,E.t)("admin.logoAssets.kvSettings.position.right")}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div class="logo-assets-admin-footer" style="
        padding: 16px 20px;
        border-top: 1px solid ${e};
        display: flex;
        gap: 8px;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        background: ${d};
      ">
        ${!(0,G.gC)()?`
          <button class="btn" id="logoAssetsAdminChangePassword" style="
            padding: 8px 16px;
            background: transparent;
            border: 1px solid ${e};
            border-radius: 6px;
            color: ${f};
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          " title="${(0,E.t)("admin.logoAssets.changePassword")}">
            <span class="material-icons" style="font-size: 18px;">lock</span>
            <span>${(0,E.t)("admin.logoAssets.changePassword")}</span>
          </button>
        `:"<div></div>"}
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" id="logoAssetsAdminSave">${(0,E.t)("admin.logoAssets.save")}</button>
          <button class="btn" id="logoAssetsAdminCancel">${(0,E.t)("admin.logoAssets.cancel")}</button>
        </div>
      </div>
    </div>
  `,document.body.appendChild(H),console.log("Модальное окно добавлено в DOM");try{K(),console.log("Превью обновлено")}catch(a){console.error("Ошибка при обновлении превью:",a)}try{!function(){let a=null,b="",d=[],e=null,f="",g=()=>q(b||a||""),h=()=>(b||a||"").split("/").filter(Boolean).length,i=()=>{if(!e||"assets"!==a)return[];let c=A(e,b);return!c||"object"!=typeof c||Array.isArray(c)?[]:Object.entries(c).filter(([,a])=>Array.isArray(a)).map(([a])=>a).sort()},k=a=>a?Array.isArray(a)?a.map(a=>"string"==typeof a?.key?a.key:"").filter(Boolean):"object"!=typeof a?[]:Object.values(a).flatMap(a=>k(a)):[],l=(a,b)=>{a&&(a.disabled=b,a.style.opacity=b?"0.55":"1",a.style.cursor=b?"not-allowed":"pointer")},m=async()=>{let c=document.getElementById("fileManagerCreateFolderBtn"),d=document.getElementById("fileManagerUploadBtn"),e=document.getElementById("fileManagerHint"),f=await j().catch(()=>!1),k="assets"===a&&f,m="logo"===a&&f,n=k?g():null,o=k?i():[],p=!n&&o.length>0,q=k&&2>=h();if(l(c,m||!!k&&!q),l(d,m||k&&!n&&!p),e){if(m){e.style.display="block",e.textContent="Логотипы сейчас берутся из общей библиотеки команды. Здесь можно быстро просматривать структуру, а для добавления новых логотипов нужен отдельный remote logo flow.";return}if(k&&!n){if(e.style.display="block",1===h()){e.textContent="В корне assets можно создавать категории. Откройте категорию, чтобы создать внутри неё папку или загрузить туда файлы.";return}e.textContent=p?`Вы находитесь в ${b}. Можно создать новую подпапку или выбрать существующую: ${o.join(", ")}.`:"В этой категории пока нет подпапок. Создайте папку и после этого загружайте в неё файлы.";return}if(k&&n){e.style.display="block",e.textContent=`Remote media активно. Загрузка пойдёт в assets/${n.folder1}/${n.folder2}.`;return}e.style.display="none",e.textContent=""}};function y(){let c=document.getElementById("fileManagerCurrentPath"),e=document.getElementById("fileManagerBackBtn");c&&(c.textContent=b||a||""),e&&(e.style.display=d.length>0?"inline-flex":"none"),m()}async function z(){if(!a)return;let c=document.getElementById("fileManagerTree");if(c){c.innerHTML='<div style="text-align: center; padding: var(--spacing-md); color: var(--text-secondary);">Загрузка...</div>';try{let f=await x(a);"assets"===a&&await j().catch(()=>!1)&&(f=((a,b)=>{let c=a&&"object"==typeof a?a:{};return(b||[]).forEach(a=>{let b=r(a);if(!b)return;let[,d,e]=b.split("/");(!c[d]||"object"!=typeof c[d]||Array.isArray(c[d]))&&(c[d]={}),e&&(!c[d][e]||"object"!=typeof c[d][e]||Array.isArray(c[d][e]))&&(c[d][e]={})}),c})(f,s())),e=f,c.innerHTML=function(a,c,d=0){getComputedStyle(document.documentElement).getPropertyValue("--border-color"),getComputedStyle(document.documentElement).getPropertyValue("--bg-primary");let e=getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9",f=getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999",g=A(a,b);if(!g)return`<div style="text-align: center; padding: var(--spacing-md); color: ${f};">Папка не найдена</div>`;let h="";if(Array.isArray(g))0===g.length?h=`<div style="text-align: center; padding: var(--spacing-md); color: ${f};">Папка пуста</div>`:g.some(a=>B(a.file))?(h='<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding: 8px;">',g.forEach(a=>{h+=C(a,!0)}),h+="</div>"):g.forEach(a=>{h+=C(a,!1)});else if("object"==typeof g&&null!==g){let a=Object.keys(g);0===a.length?h=`<div style="text-align: center; padding: var(--spacing-md); color: ${f};">Папка пуста</div>`:(a.forEach(a=>{let c=b?`${b}/${a}`:a,d=g[a];"object"!=typeof d||Array.isArray(d)||(h+=`
              <div class="file-manager-item" data-type="folder" data-path="${c}" style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); margin-left: 0px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;">
                <span class="material-icons" style="font-size: 18px; color: ${f};">folder</span>
                <span class="file-manager-folder-name" style="flex: 1; color: ${e}; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${a}</span>
                <button class="btn btn-small file-manager-rename-btn" data-path="${c}" data-type="folder" style="padding: 4px 8px; opacity: 0.7;" title="Переименовать">
                  <span class="material-icons" style="font-size: 16px;">edit</span>
                </button>
                <button class="btn btn-small file-manager-delete-btn" data-path="${c}" data-type="folder" style="padding: 4px 8px; opacity: 0.7;" title="Удалить">
                  <span class="material-icons" style="font-size: 16px;">delete</span>
                </button>
              </div>
            `)}),a.forEach(a=>{let b=g[a];Array.isArray(b)&&b.length>0&&(b.some(a=>B(a.file))?(h+=`<div style="margin-top: 16px; margin-bottom: 8px; color: ${e}; font-size: 14px; font-weight: 600;">${a}</div>`,h+='<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding: 8px; margin-bottom: 16px;">',b.forEach(a=>{h+=C(a,!0)}),h+="</div>"):b.forEach(a=>{h+=C(a,!1)}))}))}else h=`<div style="text-align: center; padding: var(--spacing-md); color: ${f};">Папка пуста</div>`;return h}(f,0),document.querySelectorAll('.file-manager-item[data-type="folder"]').forEach(a=>{a.addEventListener("click",c=>{if(c.target.closest(".file-manager-delete-btn")||c.target.closest(".file-manager-rename-btn"))return;let e=a.dataset.path;e!==b&&(b&&d.push(b),b=e,y(),z())}),a.addEventListener("mouseenter",()=>{a.style.background="var(--bg-secondary, #1a1a1a)"}),a.addEventListener("mouseleave",()=>{a.style.background="transparent"})}),document.querySelectorAll(".file-manager-rename-btn").forEach(b=>{b.addEventListener("click",async c=>{c.stopPropagation();let d=b.dataset.path,e=d.split("/").pop(),f=b.closest(".file-manager-item").querySelector(".file-manager-folder-name"),g=document.createElement("input");g.type="text",g.value=e,g.style.cssText=`
          flex: 1;
          padding: 4px 8px;
          background: var(--bg-primary, #0d0d0d);
          border: 1px solid var(--accent-color, #027EF2);
          border-radius: 4px;
          color: var(--text-primary, #e9e9e9);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
        `,f.style.display="none",f.parentNode.insertBefore(g,f),g.focus(),g.select();let h=async()=>{let b=g.value.trim();if(!b||b===e){g.remove(),f.style.display="";return}if(b.includes("/")||b.includes("\\")){alert("Имя папки не может содержать символы / или \\"),g.focus();return}if("assets"===a&&await j().catch(()=>!1)){alert("Переименование папок в assets отключено, пока не появится отдельный remote folder API."),g.remove(),f.style.display="";return}if("logo"===a&&await j().catch(()=>!1)){alert("Переименование логотипных папок пока недоступно: для remote logo еще нет отдельного folder API."),g.remove(),f.style.display="";return}try{await w.renameFolder(d,b),await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview()}catch(a){alert(`Ошибка при переименовании: ${a.message}`),g.focus()}};g.addEventListener("blur",h),g.addEventListener("keydown",a=>{"Enter"===a.key?(a.preventDefault(),h()):"Escape"===a.key&&(g.remove(),f.style.display="")})})}),document.querySelectorAll('.file-manager-item[data-type="file"]').forEach(a=>{a.addEventListener("click",b=>{if(b.target.closest(".file-manager-delete-btn")||b.target.closest(".file-manager-publish-btn"))return;let c=a.dataset.path;if(p(c))return void alert("Замена remote-файлов через UI пока не поддерживается. Для них сначала нужен отдельный replace/delete API.");let d=document.createElement("input");d.type="file",d.accept="image/*",d.style.display="none",document.body.appendChild(d),d.addEventListener("change",async a=>{if(!a.target.files.length)return;let b=a.target.files[0],e=c.substring(0,c.lastIndexOf("/"));try{await w.deleteFile(c),await w.uploadFile(b,e),await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview(),alert("Файл заменен успешно")}catch(a){alert(`Ошибка при замене файла: ${a.message}`)}document.body.removeChild(d)}),d.click()}),a.addEventListener("mouseenter",()=>{a.classList.contains("file-manager-image-item")?(a.style.transform="translateY(-2px)",a.style.boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"):a.style.background="var(--bg-secondary, #1a1a1a)"}),a.addEventListener("mouseleave",()=>{a.classList.contains("file-manager-image-item")?(a.style.transform="translateY(0)",a.style.boxShadow="none"):a.style.background="transparent"})}),document.querySelectorAll(".file-manager-delete-btn").forEach(b=>{b.addEventListener("click",async c=>{c.stopPropagation();let d=b.dataset.path,f=b.dataset.remoteKey||"",g=b.dataset.source||"",h=b.dataset.type,i="folder"===h?d.split("/").pop():v({file:d});if(confirm(`Вы уверены, что хотите удалить ${"folder"===h?"папку":"файл"} "${i}"?`))try{if("folder"===h){if("logo"===a&&await j().catch(()=>!1))throw Error("Удаление логотипных папок пока недоступно: для remote logo еще нет отдельного folder API.");if("assets"===a&&await j().catch(()=>!1)){let a=A(e,d);for(let b of Array.from(new Set(k(a))))await n({key:b});(a=>{let b=r(a);if(!b)return;let c=s().filter(a=>a!==b&&!a.startsWith(`${b}/`));return t(c)})(d)}else await w.deleteFolder(d)}else if("remote"===g||p(d)){if(!f)throw Error("Для remote-файла не найден object key.");await n({key:f})}else await w.deleteFile(d);await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview(),alert("Удалено успешно")}catch(a){alert(`Ошибка при удалении: ${a.message}`)}})}),document.querySelectorAll(".file-manager-publish-btn").forEach(a=>{a.addEventListener("click",async b=>{b.stopPropagation();let c=a.dataset.remoteKey||"",d="draft"==("draft"===a.dataset.visibility?"draft":"published")?"published":"draft";if(!c)return void alert("Для remote-файла не найден object key.");try{await o({key:c,visibility:d}),await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview(),alert("published"===d?"Файл опубликован":"Файл снят с публикации")}catch(a){alert(`Ошибка при смене статуса публикации: ${a.message}`)}})}),await m()}catch(a){console.error("Ошибка при загрузке дерева файлов:",a),c.innerHTML=`<div style="text-align: center; padding: var(--spacing-md); color: #f44336;">Ошибка: ${a.message}</div>`}}}function A(b,c){if(!c||c===a)return b;let d=(c.startsWith(a+"/")?c.substring(a.length+1):c).split("/"),e=b;for(let a of d)if(!e||"object"!=typeof e||Array.isArray(e))return null;else e=e[a];return e}function B(a){let b=String(a||"").split("?")[0].toLowerCase();return[".jpg",".jpeg",".png",".gif",".webp",".svg",".bmp",".ico"].some(a=>b.endsWith(a))}function C(a,b=!1){let c=v(a),d=a.file,e=B(d),f="string"==typeof a.key?a.key:"",g="string"==typeof a.visibility?a.visibility:"published",h="string"==typeof a.source?a.source:p(d)?"remote":"local",i="remote"===h?`
            <button class="btn btn-small file-manager-publish-btn" data-path="${d}"${f?` data-remote-key="${f}"`:""} data-source="${h}" data-visibility="${g}" style="
              padding: 4px;
              opacity: 0.7;
              flex-shrink: 0;
            " title="${"draft"===g?"Опубликовать":"Снять с публикации"}" onclick="event.stopPropagation();">
              <span class="material-icons" style="font-size: 16px;">${"draft"===g?"publish":"visibility_off"}</span>
            </button>
          `:"",j=`${f?` data-remote-key="${f}"`:""} data-source="${h}" data-visibility="${g}"`;return b&&e?`
        <div class="file-manager-item file-manager-image-item" data-type="file" data-path="${d}"${j} style="
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid ${getComputedStyle(document.documentElement).getPropertyValue("--border-color")||"#2a2a2a"};
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          background: ${getComputedStyle(document.documentElement).getPropertyValue("--bg-primary")||"#0d0d0d"};
        ">
          <div style="
            width: 100%;
            aspect-ratio: 1;
            background: ${getComputedStyle(document.documentElement).getPropertyValue("--bg-secondary")||"#141414"};
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
          ">
            <img src="${d}" alt="${c}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            " onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="
              display: none;
              width: 100%;
              height: 100%;
              align-items: center;
              justify-content: center;
              color: ${getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999"};
            ">
              <span class="material-icons" style="font-size: 32px;">broken_image</span>
            </div>
          </div>
          <div style="
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            min-height: 40px;
          ">
            <span style="
              flex: 1;
              color: ${getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9"};
              font-size: 12px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            " title="${c}">${c}</span>
            ${i}
            <button class="btn btn-small file-manager-delete-btn" data-path="${d}" data-type="file"${f?` data-remote-key="${f}"`:""} data-source="${h}" style="
              padding: 4px;
              opacity: 0.7;
              flex-shrink: 0;
            " title="Удалить" onclick="event.stopPropagation();">
              <span class="material-icons" style="font-size: 16px;">delete</span>
            </button>
          </div>
        </div>
      `:`
        <div class="file-manager-item" data-type="file" data-path="${d}"${j} style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); margin-left: 0px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;">
          ${e?`<img src="${d}" alt="${c}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><span class="material-icons" style="font-size: 18px; color: ${getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999"}; display: none;">insert_drive_file</span>`:`<span class="material-icons" style="font-size: 18px; color: ${getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")||"#999999"};">insert_drive_file</span>`}
          <span style="flex: 1; color: ${getComputedStyle(document.documentElement).getPropertyValue("--text-primary")||"#e9e9e9"}; font-size: var(--font-size-sm);">${c}</span>
          ${i}
          <button class="btn btn-small file-manager-delete-btn" data-path="${d}" data-type="file"${f?` data-remote-key="${f}"`:""} data-source="${h}" style="padding: 4px 8px; opacity: 0.7;" title="Удалить">
            <span class="material-icons" style="font-size: 16px;">delete</span>
          </button>
        </div>
      `}async function D(){let{resetAssetScannerCaches:a}=await Promise.resolve().then(c.bind(c,857));if("function"==typeof a&&a(),document.getElementById("logoAssetsAdminModal")&&"function"==typeof window.updateLogoAssetsPreview)try{window.updateLogoAssetsPreview()}catch(a){console.warn("Не удалось обновить превью в админке:",a)}let b=document.querySelector(".logo-select-modal"),d=document.querySelector(".kv-select-modal"),e=document.querySelector(".bg-select-modal");if(b&&"function"==typeof window.refreshLogoSelectModal)try{window.refreshLogoSelectModal()}catch(a){console.warn("Не удалось обновить модальное окно выбора логотипа:",a)}if(d&&"function"==typeof window.refreshKVSelectModal)try{window.refreshKVSelectModal()}catch(a){console.warn("Не удалось обновить модальное окно выбора KV:",a)}if(e&&"function"==typeof window.refreshBGSelectModal)try{window.refreshBGSelectModal()}catch(a){console.warn("Не удалось обновить модальное окно выбора фона:",a)}console.log("Библиотеки обновлены. Модальные окна обновлены автоматически.")}let E=document.getElementById("fileManagerLogoBtn"),F=document.getElementById("fileManagerAssetsBtn"),G=document.getElementById("fileManagerContent");E&&E.addEventListener("click",()=>{a="logo",b="logo",d=[],G&&(G.style.display="block"),y(),z(),E.style.background="var(--accent-color, #027EF2)",E.style.color="white",F&&(F.style.background="var(--bg-secondary, #1a1a1a)",F.style.color="var(--text-primary, #e9e9e9)")}),F&&F.addEventListener("click",()=>{a="assets",b="assets",d=[],G&&(G.style.display="block"),y(),z(),F.style.background="var(--accent-color, #027EF2)",F.style.color="white",E&&(E.style.background="var(--bg-secondary, #1a1a1a)",E.style.color="var(--text-primary, #e9e9e9)")});let H=document.getElementById("fileManagerBackBtn");H&&H.addEventListener("click",function(){b=d.length>0?d.pop():a,y(),z()});let I=document.getElementById("fileManagerCreateFolderBtn");I&&I.addEventListener("click",async()=>{if(!a)return void alert("Сначала выберите папку (logo или assets)");if("logo"===a&&await j().catch(()=>!1))return void alert("Создание папок для remote logo пока не поддерживается. Для логотипов сейчас доступен просмотр командной библиотеки.");let c=prompt("Введите имя новой папки:");if(c&&c.trim()){if(c.includes("/")||c.includes("\\"))return void alert("Имя папки не может содержать символы / или \\");try{let d="";if(b&&b.trim()&&b!==a?d=b:a&&(d=a),!d||!d.trim())return void alert("Ошибка: не выбран путь для создания папки");if(d=d.trim().replace(/^\/+|\/+$/g,""),"assets"===a&&await j().catch(()=>!1)){let a=d.split("/").filter(Boolean).length,b="";if(1===a)b=`assets/${c.trim()}`;else if(2===a)b=`${d}/${c.trim()}`;else throw Error("Для remote assets доступны только два уровня: assets/{категория}/{папка}.");u(b),await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview(),alert("Папка создана успешно");return}console.log("Создание папки:",{folderName:c.trim(),targetPath:d}),await w.createFolder(c.trim(),d),await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview(),alert("Папка создана успешно")}catch(a){console.error("Ошибка при создании папки:",a),alert(`Ошибка при создании папки: ${a.message}`)}}});let J=document.getElementById("fileManagerUploadBtn");if(J){let c=document.createElement("input");c.type="file",c.accept="image/*",c.multiple=!0,c.style.display="none",document.body.appendChild(c),J.addEventListener("click",()=>{if(!a)return void alert("Сначала выберите папку (logo или assets)");if("logo"===a)return void j().then(d=>{if(d)return void alert("Прямая загрузка логотипов в remote logo пока не подключена. Для логотипов здесь доступна библиотека команды, а загрузка ассетов работает ниже без ограничений.");f=b||a,c.click()}).catch(()=>{f=b||a,c.click()});let d=b||a;if("assets"===a)return void j().then(a=>{if(a&&!q(d)){let a=(()=>{let a=g();if(a)return`assets/${a.folder1}/${a.folder2}`;let c=(b||"").split("/").filter(Boolean);if(2!==c.length||"assets"!==c[0])return"";let d=i();if(0===d.length)return"";if(1===d.length)return`${b}/${d[0]}`;let e=prompt(`Выберите подпапку для загрузки: ${d.join(", ")}`,d[0]);if(!e)return"";let f=e.trim();return d.includes(f)?`${b}/${f}`:(alert(`Допустимые папки: ${d.join(", ")}`),"")})();if(!a)return;f=a,c.click();return}f=d,c.click()}).catch(()=>{f=d,c.click()});f=d,c.click()}),c.addEventListener("change",async d=>{if(!d.target.files.length)return;let e=f||b||a,g=Array.from(d.target.files),h="assets"===a&&await j().catch(()=>!1);try{if(h&&!q(e))throw Error("Для remote assets выберите конкретную папку вида assets/{folder1}/{folder2}");for(let a of g)await w.uploadFile(a,e);h&&q(e)&&u(e),await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview(),alert(h?`Загружено в remote media: ${g.length}`:`Загружено файлов: ${g.length}`)}catch(a){alert(`Ошибка при загрузке файлов: ${a.message}`)}f="",c.value=""})}let K=document.getElementById("fileManagerRefreshBtn");K&&K.addEventListener("click",async()=>{await z(),await D(),"function"==typeof window.updateLogoAssetsPreview&&window.updateLogoAssetsPreview()})}(),console.log("Файловый менеджер инициализирован")}catch(a){console.error("Ошибка при инициализации файлового менеджера:",a)}try{M(),console.log("Обработчики событий установлены")}catch(a){console.error("Ошибка при установке обработчиков:",a)}let{subscribe:B}=await Promise.resolve().then(c.bind(c,3590)),D=B(()=>{K()});H._unsubscribe=D,console.log("Админка успешно открыта");let F=a=>{"Escape"===a.key&&I&&N()};document.addEventListener("keydown",F),H._escapeHandler=F},M=()=>{(0,y.getState)();let a=(0,y.getDefaultValues)(),b=document.getElementById("logoAssetsAdminClose"),c=document.getElementById("logoAssetsAdminCancel");b&&b.addEventListener("click",N),c&&c.addEventListener("click",N);let d=document.getElementById("logoAssetsAdminChangePassword");d&&d.addEventListener("click",()=>{let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",c=a.getPropertyValue("--bg-secondary")||"#141414",d=a.getPropertyValue("--border-color")||"#2a2a2a",e=a.getPropertyValue("--text-primary")||"#e9e9e9",f=a.getPropertyValue("--text-secondary")||"#999999",g=document.createElement("div");g.id="logoAssetsVerifyPasswordModal",g.style.cssText=`
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
            <h2 style="margin: 0; font-size: 20px; color: ${e};">${(0,E.t)("admin.logoAssets.changePassword.verify")}</h2>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">${(0,E.t)("admin.logoAssets.changePassword.verifyLabel")}</label>
            <input type="password" id="logoAssetsVerifyPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="${(0,E.t)("admin.logoAssets.changePassword.verifyPlaceholder")}" autofocus>
            <div id="logoAssetsVerifyPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${(0,E.t)("admin.logoAssets.changePassword.error")}</div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="logoAssetsVerifyPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${d}; border-radius: 8px; color: ${e}; cursor: pointer;">${(0,E.t)("admin.logoAssets.changePassword.cancel")}</button>
            <button id="logoAssetsVerifyPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">${(0,E.t)("admin.logoAssets.changePassword.continue")}</button>
          </div>
        </div>
      `,document.body.appendChild(g);let h=document.getElementById("logoAssetsVerifyPasswordInput"),i=document.getElementById("logoAssetsVerifyPasswordError"),j=document.getElementById("logoAssetsVerifyPasswordSubmit"),k=document.getElementById("logoAssetsVerifyPasswordCancel"),l=()=>{(0,B.O7)(h.value)?(g.remove(),(()=>{let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",c=a.getPropertyValue("--bg-secondary")||"#141414",d=a.getPropertyValue("--border-color")||"#2a2a2a",e=a.getPropertyValue("--text-primary")||"#e9e9e9",f=a.getPropertyValue("--text-secondary")||"#999999";(0,B.Qq)();let g=(0,B.cw)(),h=document.createElement("div");h.id="logoAssetsChangePasswordModal",h.style.cssText=`
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
        <h2 style="margin: 0; font-size: 20px; color: ${e};">${(0,E.t)("admin.logoAssets.changePassword.title")}</h2>
      </div>
      ${g?`
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">${(0,E.t)("admin.logoAssets.changePassword.current")}</label>
        <input type="password" id="logoAssetsCurrentPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="${(0,E.t)("admin.logoAssets.changePassword.currentPlaceholder")}" autofocus>
        <div id="logoAssetsCurrentPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${(0,E.t)("admin.logoAssets.changePassword.error")}</div>
      </div>
      `:""}
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">${(0,E.t)("admin.logoAssets.changePassword.new")}</label>
        <input type="password" id="logoAssetsNewPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="${(0,E.t)("admin.logoAssets.changePassword.newPlaceholder")}" ${!g?"autofocus":""}>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">${(0,E.t)("admin.logoAssets.changePassword.confirm")}</label>
        <input type="password" id="logoAssetsConfirmPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="${(0,E.t)("admin.logoAssets.changePassword.confirmPlaceholder")}">
        <div id="logoAssetsPasswordMatchError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${(0,E.t)("admin.logoAssets.changePassword.matchError")}</div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 8px; color: ${f}; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="logoAssetsRemovePasswordCheckbox" style="width: 18px; height: 18px; cursor: pointer;">
          <span>${(0,E.t)("admin.logoAssets.changePassword.remove")}</span>
        </label>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="logoAssetsChangePasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${d}; border-radius: 8px; color: ${e}; cursor: pointer;">${(0,E.t)("admin.logoAssets.changePassword.cancel")}</button>
        <button id="logoAssetsChangePasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">${(0,E.t)("admin.logoAssets.changePassword.save")}</button>
      </div>
    </div>
  `,document.body.appendChild(h);let i=document.getElementById("logoAssetsCurrentPasswordInput"),j=document.getElementById("logoAssetsNewPasswordInput"),k=document.getElementById("logoAssetsConfirmPasswordInput"),l=document.getElementById("logoAssetsChangePasswordCheckbox"),m=document.getElementById("logoAssetsCurrentPasswordError"),n=document.getElementById("logoAssetsPasswordMatchError"),o=document.getElementById("logoAssetsChangePasswordSubmit"),p=document.getElementById("logoAssetsChangePasswordCancel");l&&l.addEventListener("change",a=>{a.target.checked?(j.disabled=!0,k.disabled=!0,j.value="",k.value=""):(j.disabled=!1,k.disabled=!1,j.focus())});let q=()=>{if(g&&i&&!(0,B.O7)(i.value)){m.style.display="block",i.style.borderColor="#f44336",i.focus();return}if(l&&l.checked){(0,B.wO)(""),h.remove(),alert((0,E.t)("admin.logoAssets.changePassword.removed"));return}let a=j.value,b=k.value;if(!a){alert((0,E.t)("admin.logoAssets.changePassword.enterNew")),j.focus();return}if(a!==b){n.style.display="block",k.style.borderColor="#f44336",k.focus();return}(0,B.wO)(a),h.remove(),alert((0,E.t)("admin.logoAssets.changePassword.success"))};o.addEventListener("click",q),p.addEventListener("click",()=>{h.remove()}),[i,j,k].forEach(a=>{a&&a.addEventListener("keydown",a=>{"Enter"===a.key?q():"Escape"===a.key&&h.remove()})}),h.addEventListener("click",a=>{a.target===h&&h.remove()}),setTimeout(()=>{g&&i?i.focus():j&&j.focus()},100)})()):(i.style.display="block",h.style.borderColor="#f44336",h.value="",h.focus())};j.addEventListener("click",l),k.addEventListener("click",()=>{g.remove()}),h.addEventListener("keydown",a=>{"Enter"===a.key?l():"Escape"===a.key&&g.remove()}),g.addEventListener("click",a=>{a.target===g&&g.remove()}),setTimeout(()=>{h.focus()},100)}),H.addEventListener("click",a=>{a.target===H&&N()});let e=document.getElementById("logoAssetsAdminSave");e&&e.addEventListener("click",async()=>{(0,y.getState)();let a=document.getElementById("logoAssetsDefaultLogoSize"),b=document.getElementById("logoAssetsDefaultLogoPos"),c=document.getElementById("logoAssetsDefaultLogoLanguage"),d=document.getElementById("logoAssetsDefaultProMode"),e=document.getElementById("logoAssetsDefaultLogoMode");if(a&&(0,y.setKey)("logoSize",parseFloat(a.value)),b&&(0,y.setKey)("logoPos",b.value),c&&(0,y.setKey)("logoLanguage",c.value),e&&(0,y.setKey)("logoDefaultMode",e.value),d){let a="true"===d.value;(0,y.setKey)("proMode",a),"function"==typeof window.selectProMode&&window.selectProMode(a)}let f=document.getElementById("logoAssetsDefaultKvBorderRadius"),g=document.getElementById("logoAssetsDefaultKvPosition");f&&(0,y.setKey)("kvBorderRadius",parseFloat(f.value)),g&&(0,y.setKey)("kvPosition",g.value);let h=(0,y.getState)();try{let a={...JSON.parse(localStorage.getItem((0,D.N5)("default-values"))||"{}"),logoSelected:h.logoSelected,kvSelected:h.kvSelected,defaultLogoRU:h.defaultLogoRU||void 0,defaultLogoKZ:h.defaultLogoKZ||void 0,defaultLogoPRO:h.defaultLogoPRO||void 0,logoDefaultMode:h.logoDefaultMode||"single",logoSize:h.logoSize,logoPos:h.logoPos,logoLanguage:h.logoLanguage,proMode:h.proMode,kvBorderRadius:h.kvBorderRadius,kvPosition:h.kvPosition};localStorage.setItem((0,D.N5)("default-values"),JSON.stringify(a))}catch(a){console.warn("Не удалось сохранить default-values:",a)}try{await (0,F.g5)()}catch(a){console.warn("Не удалось синхронизировать media defaults с workspace API:",a)}N()});let f=document.getElementById("logoAssetsDefaultLogoSelect");f&&f.addEventListener("click",async()=>{window._adminDefaultLogoVariant=null,await (0,z.$W)()});let g=document.getElementById("logoAssetsDefaultLogoClear");g&&g.addEventListener("click",()=>{(0,y.setKey)("logoSelected",a.logoSelected),K(),g.style.display="none"});let h=document.getElementById("logoAssetsDefaultKVSelect");h&&h.addEventListener("click",async()=>{await (0,A.jN)()});let i=document.getElementById("logoAssetsDefaultKVClear");i&&i.addEventListener("click",()=>{(0,y.setKey)("kvSelected",a.kvSelected),K(),i.style.display="none"});let j=document.getElementById("logoAssetsDefaultLogoMode");j&&j.addEventListener("change",()=>{let a=j.value;(0,y.setKey)("logoDefaultMode",a);let b=document.getElementById("logoAssetsLogoModeSingle"),c=document.getElementById("logoAssetsLogoModePerVariant");b&&(b.style.display="single"===a?"block":"none"),c&&(c.style.display="perVariant"===a?"block":"none")});let k=document.getElementById("logoAssetsVariantRuSelect");k&&k.addEventListener("click",async()=>{window._adminDefaultLogoVariant="ru",await (0,z.$W)()});let l=document.getElementById("logoAssetsVariantKzSelect");l&&l.addEventListener("click",async()=>{window._adminDefaultLogoVariant="kz",await (0,z.$W)()});let m=document.getElementById("logoAssetsVariantProSelect");m&&m.addEventListener("click",async()=>{window._adminDefaultLogoVariant="pro",await (0,z.$W)()})},N=()=>{I&&(I=!1,H&&(H._unsubscribe&&(H._unsubscribe(),H._unsubscribe=null),H._escapeHandler&&document.removeEventListener("keydown",H._escapeHandler),H.remove(),H=null),J=!1,console.log("Модальное окно закрыто, флаг аутентификации сброшен"))},O=async()=>{let a=(0,G.gC)()?(0,G.Al)()?(0,G.Yr)()?{enforced:!0,allowed:!0}:(alert("Эта панель доступна только роли lead или admin в текущей команде."),{enforced:!0,allowed:!1}):(alert("Войдите в workspace с ролью lead или admin, чтобы управлять командными defaults."),{enforced:!0,allowed:!1}):{enforced:!1,allowed:!1};if(a.enforced){if(!a.allowed)return;await L();return}console.log("showLogoAssetsAdmin вызвана"),console.log("isAdminAuthenticated (до сброса):",J),console.log("hasPassword():",(0,B.cw)());let b=document.getElementById("logoAssetsAdminModal");if(b){let a=window.getComputedStyle(b);if("none"!==a.display&&"hidden"!==a.visibility&&parseFloat(a.opacity)>0){N(),setTimeout(()=>{O()},100);return}}if(J=!1,!(0,B.cw)()){console.log("Пароль не установлен, открываем без пароля"),J=!0,await L();return}if(J){console.log("Уже аутентифицирован, открываем админку"),await L();return}console.log("Показываем окно ввода пароля"),(()=>{let a=getComputedStyle(document.documentElement),b=a.getPropertyValue("--bg-primary")||"#0d0d0d",c=a.getPropertyValue("--bg-secondary")||"#141414",d=a.getPropertyValue("--border-color")||"#2a2a2a",e=a.getPropertyValue("--text-primary")||"#e9e9e9",f=a.getPropertyValue("--text-secondary")||"#999999",g=document.getElementById("logoAssetsPasswordPrompt");g&&g.remove();let h=document.createElement("div");h.id="logoAssetsPasswordPrompt",h.style.cssText=`
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
        <h2 style="margin: 0; font-size: 20px; color: ${e};">${(0,E.t)("admin.logoAssets.password.title")}</h2>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${f}; font-size: 14px;">${(0,E.t)("admin.logoAssets.password.label")}</label>
        <input type="password" id="logoAssetsPasswordInput" style="width: 100%; padding: 12px; background: ${b}; border: 1px solid ${d}; border-radius: 8px; color: ${e}; font-size: 16px; box-sizing: border-box;" placeholder="${(0,E.t)("admin.logoAssets.password.placeholder")}" autofocus>
        <div id="logoAssetsPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${(0,E.t)("admin.logoAssets.password.error")}</div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="logoAssetsPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${d}; border-radius: 8px; color: ${e}; cursor: pointer;">${(0,E.t)("admin.logoAssets.password.cancel")}</button>
        <button id="logoAssetsPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">${(0,E.t)("admin.logoAssets.password.submit")}</button>
      </div>
    </div>
  `,document.body.appendChild(h);let i=h.querySelector("#logoAssetsPasswordInput"),j=h.querySelector("#logoAssetsPasswordError"),k=h.querySelector("#logoAssetsPasswordSubmit"),l=h.querySelector("#logoAssetsPasswordCancel"),m=()=>{let a=i.value;console.log("checkPassword функция:",typeof B.O7);try{let b=(0,B.O7)(a);console.log("Результат проверки пароля:",b),b?(console.log("Пароль верный, открываем админку"),J=!0,h.remove(),setTimeout(async()=>{try{await L()}catch(a){console.error("Ошибка при открытии админки:",a),alert("Ошибка при открытии админки. Проверьте консоль для деталей.")}},50)):(console.log("Пароль неверный"),j.style.display="block",i.style.borderColor="#f44336",i.value="",i.focus())}catch(a){console.error("Ошибка при проверке пароля:",a),j.style.display="block",j.textContent="Ошибка при проверке пароля",i.style.borderColor="#f44336"}};k.addEventListener("click",m),l.addEventListener("click",()=>{h.remove()}),i.addEventListener("keydown",a=>{"Enter"===a.key?m():"Escape"===a.key&&h.remove()}),h.addEventListener("click",a=>{a.target===h&&h.remove()}),setTimeout(()=>{i.focus()},100)})()}}};