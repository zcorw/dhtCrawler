function info(msg: string) {
  console.log(msg);
}

function warn(msg: string) {
  console.warn(msg);
}

function error(msg: string | Error) {
  let str = msg;
  if (msg instanceof Error) {
    str = msg.message;
  }
  console.error(str);
}

export default {
  info,
  warn,
  error,
}