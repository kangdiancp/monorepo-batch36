import EventEmitter from "events";

const emitter = new EventEmitter();
emitter.on('halo', () => console.log('we calling you!'));
emitter.on('apapunNamanya123', () => console.log('juga jalan'));

emitter.emit('halo');           // → "dipanggil!"
emitter.emit('apapunNamanya123'); // → "juga jalan"