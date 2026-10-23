import { expect, it } from 'vitest';
import { extractionCsv } from './export';

it('keeps quotes, commas and multiline fields inside a single CSV cell', () => {
    expect(extractionCsv([{field:'Employer, name',value:'Acme "Fictional"\nSecond line',confidence:0}]))
        .toBe('Field,Value,Confidence\r\n"Employer, name","Acme ""Fictional""\nSecond line","0"');
});
it('marks formula-like extracted labels and values as text, including whitespace and full-width variants', () => {
    for (const value of ['=1+1','+1+1','-1+1','@SUM(A1)','  =1+1','\t=1+1','\n=1+1','＝1+1']) {
        expect(extractionCsv([{field:value,value,confidence:0.5}]))
            .toBe(`Field,Value,Confidence\r\n"'${value}","'${value}","0.5"`);
    }
});
