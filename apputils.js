export function params(body, req) {
  for(const param of req) {
    if(body[param] == undefined) {
      return false;
    }
  }
  return true;
}
