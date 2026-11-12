// node test/engine.test.js — motor do gerador: exemplos, prompt, gráficos, rascunho .pptx, pedido à IA e leitura de planilhas.
const fs = require('fs'), path = require('path'), assert = require('assert'), zlib = require('zlib');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = { exports: {} };
new Function('module', html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1])(m);
const { buildPrompt, lerPlanilha, dadosGraf, numero, paletaDe, pedidoIA, slidesDaIA, EXEMPLOS, ESTRUTURAS, MODELO_INICIAL, NOVO_SLIDE } = m.exports;
const clone = o => JSON.parse(JSON.stringify(o));

// Nada de marca de empresa no código público
assert.ok(!/HDI|Yelum|Riscos Corporativos/i.test(html), 'sobrou menção a empresa');

// Exemplos
assert.deepStrictEqual(EXEMPLOS.map(x => x.id), ['resultados','projeto','produto','status']);
assert.strictEqual(MODELO_INICIAL, EXEMPLOS[0].estado);
const ilustra = html.match(/const ILUSTRA = \{([\s\S]*?)\n\};/)[1];
for (const x of EXEMPLOS) {
  const s = x.estado, t = buildPrompt(clone(s), null);
  assert.ok(ilustra.includes(x.icone + ':'), `${x.id}: sem ilustração`);
  assert.ok(s.slides.length >= 4 && s.slides.every(sl => ESTRUTURAS[sl.estrutura] && sl.conteudo.length > 40), `${x.id}: slides`);
  assert.strictEqual(s.slides[0].estrutura, 'capa');
  assert.ok(s.slides[0].imagens[0].uso === 'fundo' && t.includes('3840 × 2160 px'), `${x.id}: imagem da capa em alta resolução`);
  assert.ok(t.includes(`ESTRUTURA: ${s.slides.length} SLIDES`) && t.includes('ENTREGA\n\nCrie os slides diretamente'));
  assert.ok(!/undefined|null|\[object|\n0\n|NaN/.test(t), `${x.id}: lixo no texto`);
  for (const n of s.meta.numeros) assert.ok(/\[[^\]]+\]/.test(n), `${x.id}: número sem colchete: ${n}`);
  assert.ok(t.includes('GRÁFICOS EDITÁVEIS (OBRIGATÓRIO)') && t.includes('Editar Dados'), `${x.id}: seção de gráficos`);
}

// Empresa, classificação, destino "chat" e paleta personalizada
let s = clone(EXEMPLOS[0].estado);
Object.assign(s.meta, {empresa:'Acme S.A.', area:'Diretoria Comercial', classificacao:'Uso interno', destino:'chat'});
Object.assign(s.visual, {paleta:'personalizada', cor1:'#112233', cor2:'#FF8800', fonte:'Montserrat'});
let t = buildPrompt(s, null);
assert.ok(t.startsWith('Crie uma apresentação executiva em PowerPoint sobre “Resultados do [trimestre]”, conduzida por Diretoria Comercial, Acme S.A.\n'), 'sem ponto duplo no fim');
assert.ok(t.includes('conduzida por Diretoria Comercial, Acme S.A.') && t.includes('Identificação: “Acme S.A.” na capa'));
assert.ok(t.includes('RODAPÉ\n\n- “Uso interno”\n- “Acme S.A.”\n- Numeração do slide'));
assert.ok(t.includes('Cor estrutural #112233') && t.includes('destaque #FF8800') && t.includes('Fonte Montserrat nos títulos'));
assert.ok(t.includes('Cores das séries, nesta ordem: #112233, #FF8800'));
assert.ok(t.includes('XL_CHART_TYPE.LINE_MARKERS') && t.includes('Nunca use matplotlib') && t.includes('Gere o arquivo .pptx completo com código'));
assert.ok(!t.includes('Inserir > Gráfico) e preencha'), 'destino chat não usa instrução do Copilot');
s.meta.empresa = ''; s.meta.area = '';
assert.ok(buildPrompt(s, null).includes('sobre “Resultados do [trimestre]”.\n'), 'sem área e sem empresa');

// Sem gráficos e sem imagens: sem seção de gráficos, "Sem fotografias."
s = clone(EXEMPLOS[1].estado); s.slides.forEach(sl => { sl.graficos = []; sl.imagens = []; });
t = buildPrompt(s, null);
assert.ok(!t.includes('GRÁFICOS EDITÁVEIS') && t.includes('- Sem fotografias.'));

// Imagem anexada com resolução medida
s.slides[0].imagens = [{uso:'fundo', arquivo:'capa.jpg', descricao:'', largura:3840, altura:2160}];
assert.ok(buildPrompt(s, null).includes('use a imagem anexada “capa.jpg” (3840 × 2160 px).'));

// Paleta do template
const tpl = {nome:'Modelo', tamanho:'', cores:[{papel:'Escuro 2', hex:'#000080'}, {papel:'Destaque 1', hex:'#FF0000'}, {papel:'Destaque 2', hex:'#00AA00'}], fontes:{titulo:'Georgia', texto:'Arial'}, layouts:[]};
assert.deepStrictEqual([paletaDe({}, tpl).estrutural, paletaDe({}, tpl).destaque, paletaDe({}, tpl).apoio, paletaDe({}, tpl).fonteC], ['#000080', '#FF0000', ['#00AA00'], 'Arial']);

// Números do rascunho .pptx
assert.deepStrictEqual(['1.234,5', '48%', 'R$ 2.000', '12.5', '[X]', '', '-3', '1.234.567'].map(numero), [1234.5, 0.48, 2000, 12.5, null, null, -3, 1234567]);
const d = dadosGraf({tipo:'colunas', fonte:'manual', tabela:{colunas:['Área','Real','Meta'], linhas:[['A','10','12'],['B','[X]','8']]}}, []);
assert.deepStrictEqual(d.series, [{name:'Real', labels:['A','B'], values:[10, null]}, {name:'Meta', labels:['A','B'], values:[12, 8]}]);
assert.strictEqual(d.vazios, 1);
assert.strictEqual(dadosGraf({tipo:'pizza', fonte:'manual', tabela:{colunas:['X','P','Q'], linhas:[['a','50%','1']]}}, []).series.length, 1);
assert.ok(dadosGraf({tipo:'pizza', fonte:'manual', tabela:{colunas:['X','P'], linhas:[['a','50%']]}}, []).pct);

// Pedido à IA e resposta
const pedido = pedidoIA(clone(EXEMPLOS[0].estado), 'claude-opus-5-5');
assert.strictEqual(pedido.model, 'claude-opus-5-5');
assert.strictEqual(pedido.output_config.format.type, 'json_schema');
assert.ok(pedido.messages[0].content.includes('Rascunho atual dos slides') && pedido.system.includes('Nunca invente valores'));
const novos = slidesDaIA({slides:[
  {estrutura:'capa', titulo:'T', conteudo:'C', imagem:'foto', graficos:[]},
  {estrutura:'inexistente', titulo:'G', conteudo:'X', imagem:'', graficos:[{tipo:'barras', titulo:'g', unidade:'%', colunas:['a','b'], linhas:[['x','1'], ['y']]}, {tipo:'linha', titulo:'', unidade:'', colunas:['só'], linhas:[]}]}
]});
assert.strictEqual(novos[0].imagens[0].uso, 'fundo');
assert.strictEqual(novos[1].estrutura, 'livre');
assert.deepStrictEqual(novos[1].graficos.map(g => g.tabela), [{colunas:['a','b'], linhas:[['x','1'], ['y','']]}]);
assert.throws(() => slidesDaIA({slides:[]}), /não devolveu/);

// Gráfico ligado a planilha, pizza corta para uma série, gráfico vazio não entra
const base = () => { const s = clone(EXEMPLOS[1].estado); s.slides = [NOVO_SLIDE('livre')]; s.slides[0].conteudo = 'x'; return s; };
s = base();
s.planilhas = [{nome:'Resultados', colunas:['Área','Prêmio','Meta','Sinistros'], linhas:[['Norte','10','12','4'],['Sul','8','7','1'],['','9','9','9']]}];
s.slides[0].graficos = [{tipo:'colunas', fonte:'planilha', planilha:'Resultados', colRotulo:'Área', colValores:['Prêmio','Meta'], titulo:'Prêmio', unidade:'R$ mi.', descricao:'destacar o sul.'}];
t = buildPrompt(s, null);
assert.ok(t.includes('Gráficos:\n- Gráfico de colunas verticais, com o título “Prêmio”.\n  Tipo no PowerPoint: Colunas Agrupadas (Clustered Column).\n  Unidade dos valores: R$ mi.\n  Destaque: destacar o sul.\n  Dados (Área | Prêmio | Meta):\n  Norte | 10 | 12\n  Sul | 8 | 7'), t);
assert.ok(!t.includes('| 9 | 9'), 'linha sem rótulo deve sair');
s.slides[0].graficos[0].tipo = 'pizza';
assert.ok(buildPrompt(s, null).includes('Dados (Área | Prêmio):\n  Norte | 10\n'));
s.slides[0].graficos[0].planilha = 'Apagada';
assert.ok(!buildPrompt(s, null).includes('Gráficos:') && !buildPrompt(s, null).includes('GRÁFICOS EDITÁVEIS'));
s = base(); s.slides[0].graficos = [{tipo:'barras', fonte:'manual', tabela:{colunas:['Categoria','Valor'], linhas:[['',''],['','']]}}];
assert.ok(!buildPrompt(s, null).includes('Gráficos:'), 'tabela vazia não entra');

// Zip mínimo para montar um .xlsx de teste (deflate, como o Excel grava)
function zip(arquivos){
  const locais = [], central = []; let off = 0;
  for (const [nome, txt] of Object.entries(arquivos)) {
    const dados = Buffer.from(txt), comp = zlib.deflateRawSync(dados), n = Buffer.from(nome), crc = zlib.crc32(dados);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(dados.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(dados.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locais.push(h, n, comp); central.push(c, n); off += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(central.length / 2, 8); e.writeUInt16LE(central.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  const b = Buffer.concat([...locais, cd, e]); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
}
const xlsx = zip({
  'xl/workbook.xml': '<workbook><sheets><sheet name="Áreas" sheetId="1" r:id="rId1"/><sheet name="Vazia" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Target="worksheets/sheet2.xml" Id="rId2" Type="x"/></Relationships>',
  'xl/sharedStrings.xml': '<sst><si><t>Área</t></si><si><t>Receita</t></si><si><r><t>Norte</t></r><r><t xml:space="preserve"> &amp; Leste</t></r></si><si><t>Mês</t></si></sst>',
  'xl/styles.xml': '<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="mmm/yy"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="10"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>',
  'xl/worksheets/sheet1.xml': '<worksheet><sheetData>' +
    '<row r="2"><c r="B2" t="s"><v>0</v></c><c r="C2" t="s"><v>1</v></c><c r="D2" t="inlineStr"><is><t>Margem</t></is></c><c r="E2" t="s"><v>3</v></c><c r="F2" t="str"><v>Data</v></c></row>' +
    '<row r="3"><c r="B3" t="s"><v>2</v></c><c r="C3"><f>SUM(X1)</f><v>1234567.891</v></c><c r="D3" s="1"><v>0.4567</v></c><c r="E3" s="3"><v>46023</v></c><c r="F3" s="2"><v>46023</v></c></row>' +
    '<row r="4"><c r="B4" t="inlineStr"><is><t>Sul</t></is></c><c r="C4"><v>2026</v></c><c r="D4"/></row>' +
    '</sheetData></worksheet>',
  'xl/worksheets/sheet2.xml': '<worksheet><sheetData/></worksheet>'
});

(async () => {
  const [p, ...resto] = await lerPlanilha(xlsx, 'Resultado 2026.xlsx');
  assert.strictEqual(resto.length, 0, 'aba vazia não entra');
  assert.strictEqual(p.nome, 'Resultado 2026 · Áreas');
  assert.deepStrictEqual(p.colunas, ['Área','Receita','Margem','Mês','Data']);
  assert.deepStrictEqual(p.linhas, [['Norte & Leste','1.234.567,89','45,67%','01/2026','01/01/2026'], ['Sul','2026','','','']]);

  const csv = new TextEncoder().encode('﻿Área;Receita;Obs\r\n"Norte; Leste";10,5;"diz ""oi"""\r\nSul;8;\r\n').buffer;
  const [c] = await lerPlanilha(csv, 'dados.csv');
  assert.deepStrictEqual(c, {nome:'dados', colunas:['Área','Receita','Obs'], linhas:[['Norte; Leste','10,5','diz "oi"'], ['Sul','8','']], cortada:false});
  const ansi = Buffer.from('Área,Valor\nSão Paulo,3\n', 'latin1');
  assert.deepStrictEqual((await lerPlanilha(ansi.buffer.slice(ansi.byteOffset, ansi.byteOffset + ansi.length), 'x.csv'))[0].linhas, [['São Paulo','3']]);
  await assert.rejects(lerPlanilha(new ArrayBuffer(10), 'velho.xls'), /xlsx/);

  console.log(`ok: ${EXEMPLOS.length} exemplos, prompt, gráficos, rascunho .pptx, IA e planilhas`);
})().catch(e => { console.error(e); process.exit(1); });
