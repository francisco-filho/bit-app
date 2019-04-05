import "whatwg-fetch";

export function get(url, payload = false, options = {}) {
  if (payload) {
    let queryString = "?";
    let first = true;
    for (let o of payload) {
      if (!first) {
        queryString += "&";
      }
      queryString += `${o}=${payload[o]}`;
      first = false;
    }
    url = url + queryString;
  }
  options.method = "GET";
  options.credentials ='same-origin';
  return fetch(url,options).then(resp => {
    if (!resp.ok) {
      throw { status: resp.status, statusText: resp.statusText };
    }
    if (resp.redirected) {
      window.location = resp.url;
      return;
    }
    return resp.json().then(resp => resp);
  })
}


