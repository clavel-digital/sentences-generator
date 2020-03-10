const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const prefix = 'Una imagen ';
const sentenceLength = 280;
const totalSentences = 1000;

// Helpers
const checkString = str => str 
  && !str.includes('http') 
  && !str.includes('www') 
  && !str.includes(':');
const formatString = str => str.charAt(0).toLowerCase() + str.slice(1);

const booksPath = path.join(__dirname, '../books');

fs.readdir(booksPath, function (err, files) {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  }

  const books = files.filter(f => path.extname(f) === '.pdf');
  const pdfs = [];

  books.forEach(book => {
    let dataBuffer = fs.readFileSync(`./books/${book}`);
    pdfs.push(pdf(dataBuffer));
  });

  Promise.all(pdfs).then(data => {
    const matches = [];

    data.forEach((d, index) => {
      const text = d.text;
      const regExp = new RegExp(/\W((que|de)\s.*?)(\.|,|;|\?|!)/, 'gmi');
      let match;

      while (match = regExp.exec(text)) {
        if (checkString(match[1])) {
          matches.push({
            book: books[index],
            sentence: `${prefix}${formatString(match[1])}`
          });
        }
      }
    });

    const result = [];

    while (result.length < totalSentences && matches.length) {
      const index = Math.floor(Math.random() * matches.length);
      const sentence = matches[index].sentence
        .replace(/(\n|\s{2})/g, ' ')
        .replace(/('|"|«|»)/g, '')
        .trim();

      const exists = result.some(r => r.sentence === sentence);

      if (sentence && sentence.length <= sentenceLength && !exists) {
        result.push({
          sentence,
          book: matches[index].book
        });
      }

      matches.splice(index, 1);
    }
    
    generateCsv(result);
  });
});

const generateCsv = data => {
  const outputFilePath = path.join(__dirname, '../output/una_imagen.csv');

  checkOutputFile(outputFilePath);

  const csvWriter = createCsvWriter({
    path: outputFilePath,
    header: [
      { id: 'sentence', title: 'Tweet' },
      { id: 'book', title: 'Libro' }
    ]
  });

  csvWriter.writeRecords(data)
    .then(() => {
      console.log('Done!');
    });
}

const checkOutputFile = outputFilePath => {
  const outputPath = path.join(__dirname, '../output');

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  if (!fs.existsSync(outputFilePath)){
    fs.writeFileSync(outputFilePath, '');
  }
}