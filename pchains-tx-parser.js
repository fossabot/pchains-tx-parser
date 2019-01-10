// HEX <-> DEC converter (high precision for 64 bit strings)
var converter = require('hex2dec');
//Parser
exports.getInfo = (message) => {
  //Vars
  var arr = message.split('');
  var finalObj = {
      ticker: '',
      type: '',
      amount: ''
  }
  var obj = {
    instructions: [],
    errors: []
  }
  var test = false;
  var ticker = false;
  var genesis = false;
  //Token Ticker and transaction type
  const getTicker = (message) => {
    var arr = message.split('');
    var done = false;
    var a;
    for(a = 0; a < arr.length; a++){
      if(arr[a] === '@' && !done){
        done = true;
      } else if(!done) {
        finalObj.ticker += arr[a];
      } else if(genesis) {
        if(arr.lenght <= 1){
          finalObj.amount = Number(finalObj.amount);
          return finalObj;
        } else {
          finalObj.amount += arr[a];
        }
      } else {
        if(arr[a] === '@' && done){
          if(finalObj.type === 'genesis'){
            genesis = true;
          } else {
            finalObj.amount = Number(finalObj.amount);
            return finalObj;
          }
        } else if(done){
          finalObj.type += arr[a];
        }
      }

    }

  }
  var x = getTicker(message);
  //Get parsed Ciyam bytecode (already endian converted)
  const parse = (hex) => {
    //Vars
    var arr = hex.split('');
    var strArr = [];
    var valid = false;
    var done = false;

    //Validates input for type string
    const validateStr = () => {
      if(typeof hex !== 'string'){
        done = true;
        return false;
      } else {
        return true;
      }
    }
    valid = validateStr();
    //Parses instructions like "01 "
    const parseInstr = () => {
      var prev = '';
      strArr = [];
      for(var a = 0; a < 2; a++){
        prev += arr.splice(0, 1);
      }
      strArr.push(prev);
      parseVar();
    }
    //Parses vars like "00000000 "
    const parseVar = () => {
      prev = '';
      for(var a = 0; a < 8; a++){
        prev += arr.splice(0, 1);
      }
      prev = endian(prev);
      strArr.push(prev);
      parseLiteral();
    }
    //Parses literal like "0000000000000000"
    const parseLiteral = () => {
      prev = '';
      for(var a = 0; a < 16; a++){
        prev += arr.splice(0, 1);
      }
      prev = endian(prev);
      strArr.push(prev);
      obj.instructions.push(strArr);
      done = true;
    }
    //Creates and returns an object with the transaction data from the sender
    const getTxDetails = (opCodeObj) => {
      var fee = converter.hexToDec(opCodeObj.instructions[2][2]);
      if(fee === ''){
        fee = 0;
      }
      var data = {
        sender: converter.hexToDec(opCodeObj.instructions[0][2]),
        receiver: converter.hexToDec(opCodeObj.instructions[3][2]),
        amount: Number(converter.hexToDec(opCodeObj.instructions[1][2])),
        fee: Number(fee),
        merge: Number(converter.hexToDec(opCodeObj.instructions[4][2]))
      };
      return data;
    }

    //Endian converter
    const endian = (string) => {
      var arr = [];
      var a;
      for (a = 0; a < string.length; a){
        arr.push(string.slice(a, a + 2));
        a += 2;
      }
      if(a >= string.length){
        var newArr = [];
        var b;
        for(b = arr.length-1; b >= 0; b--){
          newArr.push(arr[b]);
        }
        if(b < 0){
          string = newArr.join('');
          return string;
        }
      }
    }
    //Fires Workflow
    for(var a = 0; a < a+1; a){
      if(valid){
        //valid hex string (error handling)
        if(done){
          //done parsing instruction
          if(arr.length >= 26){
            //there is still more instructions to parse
            str = '';
            done = false;
            parseInstr();
          } else if(arr.length >= 1){
            //there is more instructions but code is incomplete (error handling)
            var strErr = arr.join('');
            obj.errors.push(['Something went wrong. Unable to parse the entire hex string', strErr]);
            return obj;
          } else {
            //finished parsing all instructions... Decode and return!
            var data = getTxDetails(obj);
            return data;
          }
        } else if(a === 0){
          //run only for the first instruction to be parsed (exception)
          a++;
          parseInstr();
        }

      } else {
        //not valid hex string (error handling)
        if (done) {
          obj.errors.push(['Need to provide a valid hex string...', hex]);
          return obj;
        }
      }
    }
  }
  //If genesis type return data
  if(finalObj.type === 'genesis'){
    return finalObj;
  }
  //If normal transaction
  var tx = '';
  for(var a = 0; a < arr.length; a++){
    if(arr[a] === '@'){
      if(ticker === false){
        ticker = true;
      } else {
        if(test === false){
          test = true;
        }
      }
    } else {
      if(test === true && ticker === true){
        tx += arr[a];
      }
    }
    if(a === arr.length - 1){
      finalObj.data = parse(tx);
      return finalObj;
    }
  }
}
