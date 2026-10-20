import EventEmitter from "events";

const emitter = new EventEmitter();
emitter.on('halo', () => console.log('we calling you!'));
emitter.on('123', () => console.log('juga jalan'));

emitter.emit('halo');           // → "dipanggil!"
emitter.emit('123'); // → "juga jalan"