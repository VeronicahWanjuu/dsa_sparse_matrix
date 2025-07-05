const fs = require('fs');
const readline = require('readline'); // we need this to ask the user stuff

class SparseMatrix {
 constructor(matrixFilePath = null, numRows = 0, numCols = 0) {
 this.rows = numRows;
 this.cols = numCols;
 this.data = {}; // this holds our matrix values
 
 if (matrixFilePath) {
 this._loadFromFile(matrixFilePath);
 }
 }

 _loadFromFile(filePath) {
 try {
 const fileContent = fs.readFileSync(filePath, 'utf8');
 const lines = fileContent.split('\n');
 
 // Figure out how many rows and columns we have
 const rowsLine = lines[0].trim();
 const colsLine = lines[1].trim();
 
 if (!rowsLine.startsWith('rows=') || !colsLine.startsWith('cols=')) {
   throw new Error("Input file has wrong format");
 }
 
 this.rows = parseInt(rowsLine.substring(5));
 this.cols = parseInt(colsLine.substring(5));
 
 if (isNaN(this.rows) || isNaN(this.cols)) {
   throw new Error("Input file has wrong format");
 }
 
 for (let i = 2; i < lines.length; i++) {
   const line = lines[i].trim();
   if (!line) continue; // Skip empty lines
   
    // Break down each line to get the row, column, and value
   const elementData = this._parseElementLine(line);
   if (!elementData) {
     throw new Error("Input file has wrong format");
   }
   
   const [row, col, value] = elementData;
   this.setElement(row, col, value);
 }
 } catch (error) {
 if (error.code === 'ENOENT') {
 throw new Error(`File ${filePath} not found.`);
 }
 throw error;
 }
 }
 
  // This function reads lines and breaks them apart
 _parseElementLine(line) {
   if (!line.startsWith('(') || !line.endsWith(')')) {
     return null;
   }
   
   // Extract content between the parentheses
   const content = line.substring(1, line.length - 1);
   const parts = content.split(',');
   
   if (parts.length !== 3) {
     return null;
   }
   
   const row = parseInt(parts[0].trim());
   const col = parseInt(parts[1].trim());
   const value = parseInt(parts[2].trim());
   
   if (isNaN(row) || isNaN(col) || isNaN(value)) {
     return null;
   }
   
   return [row, col, value];
 }
 
 getElement(currRow, currCol) {
 const key = `${currRow},${currCol}`;
 return this.data[key] || 0;
 }
 setElement(currRow, currCol, value) {
 const key = `${currRow},${currCol}`;
 if (value === 0) {
 delete this.data[key]; // if the value is 0, we don't need to store it
 } else {
 this.data[key] = value;
 }
 }

 saveToFile(filename) {
 let content = `rows=${this.rows}\n`;
 content += `cols=${this.cols}\n`;
 
 // Put the matrix elements in order before saving
 const keys = Object.keys(this.data).sort((a, b) => {
 const [rowA, colA] = a.split(',').map(Number);
 const [rowB, colB] = b.split(',').map(Number);
 return rowA !== rowB ? rowA - rowB : colA - colB;
 });
 
 for (const key of keys) {
 const [row, col] = key.split(',').map(Number);
 content += `(${row}, ${col}, ${this.data[key]})\n`;
 }
 
 fs.writeFileSync(filename, content);
 }
}

function addMatrices(mat1, mat2) {
 const maxRows = Math.max(mat1.rows, mat2.rows);
 const maxCols = Math.max(mat1.cols, mat2.cols);
 
 const result = new SparseMatrix(null, maxRows, maxCols);
 
// Add up all the numbers from the first matrix
 for (const key in mat1.data) {
 const [row, col] = key.split(',').map(Number);
 const sum = mat1.data[key] + mat2.getElement(row, col);
 result.setElement(row, col, sum);
 }
 
 // Now add any numbers that are only in the second matrix
 for (const key in mat2.data) {
 const [row, col] = key.split(',').map(Number);
 const matKey = `${row},${col}`;
 if (!(matKey in mat1.data)) {
 result.setElement(row, col, mat2.data[key]);
 }
 }
 
 return result;
}
function subtractMatrices(mat1, mat2) {
 const maxRows = Math.max(mat1.rows, mat2.rows);
 const maxCols = Math.max(mat1.cols, mat2.cols);
 
 const result = new SparseMatrix(null, maxRows, maxCols);
 
  // Subtract the second matrix from the first matrix
 for (const key in mat1.data) {
 const [row, col] = key.split(',').map(Number);
 const diff = mat1.data[key] - mat2.getElement(row, col);
 result.setElement(row, col, diff);
 }
 
 // Handle numbers that are only in the second matrix and make them negative
 for (const key in mat2.data) {
 const [row, col] = key.split(',').map(Number);
 const matKey = `${row},${col}`;
 if (!(matKey in mat1.data)) {
 result.setElement(row, col, -mat2.data[key]);
 }
 }
 
 return result;
}

function multiplyMatrices(mat1, mat2) {
 if (mat1.cols !== mat2.rows) {
 throw new Error("Matrix multiplication is not possible: Column count of first matrix must equal row count of second matrix");
 }
 
 const result = new SparseMatrix(null, mat1.rows, mat2.cols);
 
 // Skip calculation if either matrix is empty
 if (Object.keys(mat1.data).length === 0 || Object.keys(mat2.data).length === 0) {
 return result;
 }
 

 // Organize our matrices to make multiplication faster
 const mat1ByRows = {};
 const mat2ByCols = {};
 
  // Group all the numbers in the first matrix by their rows
 for (const key in mat1.data) {
   const [row, col] = key.split(',').map(Number);
   if (!mat1ByRows[row]) {
     mat1ByRows[row] = {};
   }
   mat1ByRows[row][col] = mat1.data[key];
 }
 
 // Group all the numbers in the second matrix by their columns
 for (const key in mat2.data) {
   const [row, col] = key.split(',').map(Number);
   if (!mat2ByCols[col]) {
     mat2ByCols[col] = {};
   }
   mat2ByCols[col][row] = mat2.data[key];
 }
 
 // multiply the matrices by going through each row and column
 for (const row1 in mat1ByRows) {
   const rowElements = mat1ByRows[row1];
   
   for (const col2 in mat2ByCols) {
     const colElements = mat2ByCols[col2];
     
     let sum = 0;
     let hasContribution = false;
     
      // Only look at positions where both matrices have numbers
     for (const k in rowElements) {
        // Check if there is a matching number in the second matrix
       if (colElements[k]) {
         sum += rowElements[k] * colElements[k];
         hasContribution = true;
       }
     }
     
      // Only save the result if it's not zero
     if (hasContribution && sum !== 0) {
       result.setElement(parseInt(row1), parseInt(col2), sum);
     }
   }
 }
 
 return result;
}

// Test cases
function runTests() {
 console.log("Running tests...");
 
 
 const m1 = new SparseMatrix(null, 3, 3);
 m1.setElement(0, 1, 5);
 m1.setElement(1, 2, 10);
 
 const m2 = new SparseMatrix(null, 3, 3);
 m2.setElement(0, 1, 2);
 m2.setElement(1, 2, 8);
 
 // Test addition
 const addResult = addMatrices(m1, m2);
 if (addResult.getElement(0, 1) === 7 && addResult.getElement(1, 2) === 18) {
 console.log(" Addition test passed");
 } else {
 console.log(" Addition test failed");
 }
 
 // Test subtraction
 const subResult = subtractMatrices(m1, m2);
 if (subResult.getElement(0, 1) === 3 && subResult.getElement(1, 2) === 2) {
 console.log(" Subtraction test passed");
 } else {
 console.log(" Subtraction test failed");
 }
 
 // Test multiplication
 const multM1 = new SparseMatrix(null, 2, 2);
 multM1.setElement(0, 0, 1);
 multM1.setElement(0, 1, 2);
 
 const multM2 = new SparseMatrix(null, 2, 2);
 multM2.setElement(0, 0, 3);
 multM2.setElement(1, 0, 4);
 
 const multResult = multiplyMatrices(multM1, multM2);
 if (multResult.getElement(0, 0) === 11) { // 1*3 + 2*4 = 11
 console.log(" Multiplication test passed");
 } else {
 console.log(" Multiplication test failed");
 }
 
 console.log("Tests completed");
}

function createInterface() {
 return readline.createInterface({
 input: process.stdin,
 output: process.stdout
 });
}

async function main() {
 console.log("Sparse Matrix Operations");
 
 const rl = createInterface();
 
 try {
 // Get input file paths from user
 const file1 = await new Promise(resolve => {
 rl.question("Enter path for first matrix file: ", answer => resolve(answer.trim()));
 });
 
 const file2 = await new Promise(resolve => {
 rl.question("Enter path for second matrix file: ", answer => resolve(answer.trim()));
 });
 
 // Load matrices
 const mat1 = new SparseMatrix(file1);
 const mat2 = new SparseMatrix(file2);
 
 // Choose operation
 console.log("\nChoose operation:\n1. Addition\n2. Subtraction\n3. Multiplication");
 const choice = await new Promise(resolve => {
 rl.question("Enter your choice (1/2/3): ", answer => resolve(answer.trim()));
 });
 
 let result = null;
 
 if (choice === '1') {
 result = addMatrices(mat1, mat2);
 } else if (choice === '2') {
 result = subtractMatrices(mat1, mat2);
 } else if (choice === '3') {
 result = multiplyMatrices(mat1, mat2);
 } else {
 console.log("Invalid choice!");
 rl.close();
 return;
 }
 
// If everything worked, show the result and save it
 if (result) {
 console.log("\nResult matrix:");
 
 
 const outputFile = await new Promise(resolve => {
 rl.question("\nEnter output file name (default: result.txt): ", answer => {
 resolve(answer.trim() || "result.txt");
 });
 });
 
 result.saveToFile(outputFile);
 console.log(` Result saved to ${outputFile}`);
 }
 } catch (error) {
 console.error(` Error: ${error.message}`);
 } finally {
 rl.close();
 }
}

// Check if the user wants to run tests or the main program
if (process.argv.length > 2 && process.argv[2] === "test") {
 runTests();
} else {
 main();
}

module.exports = {
 SparseMatrix,
 addMatrices,
 subtractMatrices,
 multiplyMatrices
};