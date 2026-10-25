import {extractionService,extractionFailure} from '../server/extraction.js';
export const config={maxDuration:60};
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 try{return res.status(200).json(await extractionService()({authorization:req.headers.authorization,body:req.body}));}
 catch(error){const result=extractionFailure(error);if(result.retryAfter)res.setHeader('Retry-After',String(result.retryAfter));return res.status(result.status).json(result.body);}
}
