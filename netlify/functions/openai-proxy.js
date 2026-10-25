import {extractionService,extractionFailure} from '../../server/extraction.js';
export async function handler(event){
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store'};
 if(event.httpMethod!=='POST')return {statusCode:405,headers:{...headers,Allow:'POST'},body:JSON.stringify({error:'Method not allowed'})};
 if(event.isBase64Encoded)return {statusCode:400,headers,body:JSON.stringify({error:'Send a JSON document request.'})};
 try{return {statusCode:200,headers,body:JSON.stringify(await extractionService()({authorization:event.headers?.authorization || event.headers?.Authorization,body:event.body}))};}
 catch(error){const result=extractionFailure(error);return {statusCode:result.status,headers:{...headers,...(result.retryAfter?{'Retry-After':String(result.retryAfter)}:{})},body:JSON.stringify(result.body)};}
}
