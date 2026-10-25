import {supabase,ACCOUNT_UNAVAILABLE} from './supabase';
export const MAX_FILE_BYTES=2*1024*1024;
export interface ExtractedData {field:string;value:string;confidence:number}

export function checkExtractionFile(file:File){
 if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PDF, PNG, JPG or WebP document.');
 if(!file.size || file.size>MAX_FILE_BYTES)throw new Error('Choose a document no larger than 2 MB.');
}
const fileToDataUrl=(file:File)=>new Promise<string>((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('The file could not be read.'));
 reader.onerror=()=>reject(new Error('The file could not be read. Please choose it again.'));
 reader.readAsDataURL(file);
});

export async function extractLoanData(file:File,docType='Other'):Promise<ExtractedData[]>{
 checkExtractionFile(file);
 if(!supabase)throw new Error(ACCOUNT_UNAVAILABLE);
 const {data:{session},error}=await supabase.auth.getSession();
 if(error || !session?.access_token)throw new Error('Please sign in again before processing a document.');
 const dataUrl=await fileToDataUrl(file);
 const response=await fetch('/api/openai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({docType,dataUrl}),signal:AbortSignal.timeout(65000)});
 let result;
 try{result=await response.json();}catch{throw new Error('Document processing is unavailable. Please try again later.');}
 if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Document processing failed. Please retry.');
 if(!Array.isArray(result.data) || !result.data.length)throw new Error('No extracted fields were returned. Please try a readable document.');
 return result.data;
}
