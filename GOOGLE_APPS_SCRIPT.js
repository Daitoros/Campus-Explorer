/**
 * Google Apps Script para o Campus Explorer
 * 
 * Instruções:
 * 1. Crie uma nova Planilha Google.
 * 2. Vá em Extensões > Apps Script.
 * 3. Cole este código no editor.
 * 4. Clique em "Implantar" > "Nova implantação".
 * 5. Selecione "App da Web".
 * 6. Em "Quem pode acessar", selecione "Qualquer um".
 * 7. Copie a URL gerada e coloque no seu arquivo .env como GOOGLE_APPS_SCRIPT_URL.
 */

function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var value = data[i][j];
      // Tenta converter strings numéricas de volta para números
      if (headers[j] === 'latitude' || headers[j] === 'longitude') {
        value = parseFloat(value);
      }
      obj[headers[j]] = value;
    }
    result.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;
  var id = payload.id;
  
  // Cabeçalhos esperados: id, nome, descricao, categoria, local, latitude, longitude, tipo, instagram, website, localPaiId
  var headers = ["id", "nome", "descricao", "categoria", "local", "latitude", "longitude", "tipo", "instagram", "website", "localPaiId"];
  
  // Inicializa planilha se estiver vazia
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  if (action === 'add') {
    var row = headers.map(h => payload[h] || "");
    sheet.appendRow(row);
  } 
  else if (action === 'edit') {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        var row = headers.map(h => payload[h] || "");
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
        break;
      }
    }
  } 
  else if (action === 'delete') {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", action: action }))
    .setMimeType(ContentService.MimeType.JSON);
}
