import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName) => {
    // data is an array of objects
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    
    // Generate buffer
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
