


function time_id(OriginalMethod : any, context : ClassMethodDecoratorContext){
    return function(this : any, ...args: any[]){

        const start = performance.now();

        const result = OriginalMethod.call(this, ...args);

        const end = performance.now(); 

        console.log("function : ", context.name, " took ", (end - start), "ms");
        
        return result;
    }
}

function get_bytes(value : any){
    if (typeof value === 'boolean')
        return 1
    
    if (typeof value === 'number')
        return Number.isInteger(value) ? 4 : 8;
    

    if (typeof value === "string")
        return value.length
    
    if (Array.isArray(value)){
        let total_byte = 0;
        for (const val of value){
            total_byte += get_bytes(val);
        }
        return total_byte;
    }
      
    if (value === null || value === undefined)
        return 0
    
    return 0;
}

function calculate_storage(values : any[]){
    return values.reduce((total, value ) => total + get_bytes(value), 0);
}

const data = [
    10,           
    10.5,         
    "A",          
    "Hello",      
    true,         
    [1, 2, 3],    
]

console.log(calculate_storage(data));