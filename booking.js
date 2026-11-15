// Cal.com's supplied inline embed, with the pasted escaping/syntax corrected.
(function (C, A, L) {
  const push = (api, args) => api.q.push(args);
  const doc = C.document;
  C.Cal = C.Cal || function () {
    const cal = C.Cal;
    const args = arguments;
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      const script = doc.createElement('script');
      script.src = A;
      script.async = true;
      doc.head.appendChild(script);
      cal.loaded = true;
    }
    if (args[0] === L) {
      const api = function () { push(api, arguments); };
      const namespace = args[1];
      api.q = api.q || [];
      if (typeof namespace === 'string') {
        cal.ns[namespace] = cal.ns[namespace] || api;
        push(cal.ns[namespace], args);
        push(cal, ['initNamespace', namespace]);
      } else push(cal, args);
      return;
    }
    push(cal, args);
  };
})(window, 'https://app.cal.com/embed/embed.js', 'init');

Cal('init', '15min', { origin: 'https://app.cal.com' });
Cal.config = Cal.config || {};
Cal.config.forwardQueryParams = true;

Cal.ns['15min']('inline', {
  elementOrSelector: '#my-cal-inline-15min',
  config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'light' },
  calLink: 'graafstudio/15min',
});
Cal.ns['15min']('ui', { hideEventTypeDetails: false, layout: 'month_view', theme: 'light' });
