const { Document, Packer, Paragraph, TextRun } = require('docx');

async function textToDocxBuffer(text) {
  const paragraphs = text.split('\n').map(
    (line) => new Paragraph({ children: [new TextRun(line || ' ')] })
  );
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

module.exports = { textToDocxBuffer };
