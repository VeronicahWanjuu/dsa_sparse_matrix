const fs = require('fs');
const readline = require('readline');

class SparseMatrix {
 constructor(matrixFilePath = null, numRows = 0, numCols = 0) {
 this.rows = numRows;
 this.cols = numCols;
 this.data = {}; // Store values as {'row,col': value}
 
 if (matrixFilePath) {
 this._loadFromFile(matrixFilePath);
 }
 }

 _loadFromFile(filePath) {
 try {
 const fileContent = fs.readFileSync(filePath, 'utf8');
 const lines = fileContent.split('\n');
 
 // Parse rows and columns
 const rowsMatch = lines[0].match(/^rows=(\d+)$/);
 const colsMatch = lines[1].match(/^cols=(\d+)$/);
 
 if (!rowsMatch || !colsMatch) {
 throw new Error("Input file has wrong format");
 }
 
 this.rows = parseInt(rowsMatch[1]);
 this.cols = parseInt(colsMatch[1]);
 
 for (let i = 2; i < lines.length; i++) {
 const line = lines[i].trim();
 if (!line) continue; // Skip empty lines
 
 const elementMatch = line.match(/^\((\d+),\s*(\d+),\s*(-?\d+)\)$/);
 if (!elementMatch) {
 throw new Error("Input file has wrong format");
 }
 
 const row = parseInt(elementMatch[1]);
 const col = parseInt(elementMatch[2]);
 const value = parseInt(elementMatch[3]);
 
 this.setElement(row, col, value);
 }
 } catch (error) {
 if (error.code === 'ENOENT') {
 throw new Error(`File ${filePath} not found.`);
 }
 throw error;
 }
 }
 getElement(currRow, currCol) {
 const key = `${currRow},${currCol}`;
 return this.data[key] || 0;
 }
 setElement(currRow, currCol, value) {
 const key = `${currRow},${currCol}`;
 if (value === 0) {
 delete this.data[key]; 
 } else {
 this.data[key] = value;
 }
 }

 saveToFile(filename) {
 let content = `rows=${this.rows}\n`;
 content += `cols=${this.cols}\n`;
 
 // Sort keys to write in order
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
 
 // Add elements from mat1
 for (const key in mat1.data) {
 const [row, col] = key.split(',').map(Number);
 const sum = mat1.data[key] + mat2.getElement(row, col);
 result.setElement(row, col, sum);
 }
 
 // Add elements that are only in mat2
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
 
 // Process elements from mat1
 for (const key in mat1.data) {
 const [row, col] = key.split(',').map(Number);
 const diff = mat1.data[key] - mat2.getElement(row, col);
 result.setElement(row, col, diff);
 }
 
 // Process elements that are only in mat2
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
 
 // Create a map of rows to columns for the first matrix
 const mat1RowToColMap = {};
 for (const key in mat1.data) {
 const [row, col] = key.split(',').map(Number);
 if (!mat1RowToColMap[row]) {
 mat1RowToColMap[row] = new Set();
 }
 mat1RowToColMap[row].add(col);
 }
 
 // Create a map of columns to rows for the second matrix
 const mat2ColToRowMap = {};
 for (const key in mat2.data) {
 const [row, col] = key.split(',').map(Number);
 if (!mat2ColToRowMap[col]) {
 mat2ColToRowMap[col] = new Set();
 }
 mat2ColToRowMap[col].add(row);
 }
 const intersectionMap = {};
 
 for (const row1 in mat1RowToColMap) {
 const colsInRow1 = mat1RowToColMap[row1];
 
 for (const col2 in mat2ColToRowMap) {
 const rowsInCol2 = mat2ColToRowMap[col2];
 const commonIndices = [...colsInRow1].filter(col => rowsInCol2.has(col));
 
 if (commonIndices.length > 0) {
 const resultKey = `${row1},${col2}`;
 intersectionMap[resultKey] = commonIndices;
 }
 }
 }
 
 // Now compute only the elements with potential non-zero values
 for (const resultKey in intersectionMap) {
 const [row1, col2] = resultKey.split(',').map(Number);
 const commonIndices = intersectionMap[resultKey];
 
 let sum = 0;
 for (const k of commonIndices) {
 const val1 = mat1.getElement(row1, k);
 const val2 = mat2.getElement(k, col2);
 sum += val1 * val2;
 }
 
 if (sum !== 0) {
 result.setElement(row1, col2, sum);
 }
 }
 
 return result;
}
// Test cases
function runTests() {
 console.log("Running tests...");
 
 // Test matrix creation and element access
 const m1 = new SparseMatrix(null, 3, 3);
 m1.setElement(0, 1, 5);
 m1.setElement(1, 2, 10);
 
 const m2 = new SparseMatrix(null, 3, 3);
 m2.setElement(0, 1, 2);
 m2.setElement(1, 2, 8);
 
 // Test addition
 const addResult = addMatrices(m1, m2);
 if (addResult.getElement(0, 1) === 7 && addResult.getElement(1, 2) === 18) {
 console.log("✅ Addition test passed");
 } else {
 console.log("❌ Addition test failed");
 }
 
 // Test subtraction
 const subResult = subtractMatrices(m1, m2);
 if (subResult.getElement(0, 1) === 3 && subResult.getElement(1, 2) === 2) {
 console.log("✅ Subtraction test passed");
 } else {
 console.log("❌ Subtraction test failed");
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
 console.log("✅ Multiplication test passed");
 } else {
 console.log("❌ Multiplication test failed");
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
 console.log("❌ Invalid choice!");
 rl.close();
 return;
 }
 
 // If operation was successful, display and save the result
 if (result) {
 console.log("\nResult matrix:");
 
 
 const outputFile = await new Promise(resolve => {
 rl.question("\nEnter output file name (default: result.txt): ", answer => {
 resolve(answer.trim() || "result.txt");
 });
 });
 
 result.saveToFile(outputFile);
 console.log(`✅ Result saved to ${outputFile}`);
 }
 } catch (error) {
 console.error(`❌ Error: ${error.message}`);
 } finally {
 rl.close();
 }
}

// Process command line arguments
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