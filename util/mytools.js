class MyTools {

  static log(text, type) { // todo: save logs
    if (!type) type = 'log';

    switch (type) {
      case 'recv': case 'r':
        console.log('recv'.blue + '\t' + text.grey);
        break;
      case 'status':
        console.log('status'.green + '\t' + text);
        break;
      case 'error': case 'e':
        console.log('error'.red + '\t' + text);
        break;
      case 'sim':
        console.log('sim'.magenta + '\t' + text);
        break;
      case 'battle':
        console.log('battle'.cyan + '\t' + text);
        break;
      case 'sent':
        console.log('sent'.yellow + '\t' + text);
        break;
      default:
        console.log(type + '\t' + text);
        break;
    }
  }
  
}

module.exports = MyTools;
