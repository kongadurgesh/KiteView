/** Map exchange tickers to Yahoo Finance symbols for quotes/charts. */

export function nseToYahoo(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
  return s ? `${s}.NS` : '';
}

export function usToYahoo(symbol) {
  return String(symbol).trim().toUpperCase().replace(/\.(NS|BO|L|DE|PA|AX|HK|T)$/i, '');
}

export function ukToYahoo(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/\.L$/i, '');
  return s ? `${s}.L` : '';
}

export function deToYahoo(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/\.DE$/i, '');
  return s ? `${s}.DE` : '';
}

export function frToYahoo(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/\.PA$/i, '');
  return s ? `${s}.PA` : '';
}

export function jpToYahoo(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/\.T$/i, '');
  return s ? `${s}.T` : '';
}

export function hkToYahoo(symbol) {
  const s = String(symbol).trim().replace(/\.HK$/i, '');
  if (/^\d+$/.test(s)) return `${s.padStart(4, '0')}.HK`;
  return s.includes('.') ? s : `${s}.HK`;
}

export function auToYahoo(symbol) {
  const s = String(symbol).trim().toUpperCase().replace(/\.AX$/i, '');
  return s ? `${s}.AX` : '';
}

export function toYahooByMarket(symbol, name, market) {
  switch (market) {
    case 'nse':
      return { symbol: nseToYahoo(symbol), shortName: name || symbol };
    case 'us':
      return { symbol: usToYahoo(symbol), shortName: name || symbol };
    case 'uk':
      return { symbol: ukToYahoo(symbol), shortName: name || symbol };
    case 'de':
      return { symbol: deToYahoo(symbol), shortName: name || symbol };
    case 'fr':
      return { symbol: frToYahoo(symbol), shortName: name || symbol };
    case 'jp':
      return { symbol: jpToYahoo(symbol), shortName: name || symbol };
    case 'hk':
      return { symbol: hkToYahoo(symbol), shortName: name || symbol };
    case 'au':
      return { symbol: auToYahoo(symbol), shortName: name || symbol };
    default:
      return { symbol: usToYahoo(symbol), shortName: name || symbol };
  }
}
