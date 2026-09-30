/* Vzorec za _assets/nastavitve.js - neobvezne nastavitve za Home Assistant.

   Na javni strani te datoteke ni in je ne rabi: brez nje se gumba za
   nakupovalni seznam in pecico sama skrijeta. Kadar strani streze Home
   Assistant (/config/www -> /local/), jo skopiraj v nastavitve.js in vpisi
   ID-je svojih webhookov. Prava datoteka je v .gitignore.

   webhook         ID HA webhooka, ki sprejme seznam sestavin za nakup
   seznam          ime seznama za besedilo obvestila ("Dodano na seznam ...")
   webhookPecica   ID HA webhooka za gretje pecice in casovnik
   nazajPoti       izjeme za gumb "nazaj" v HA dashboardu:
                     { 'moj-dashboard': '/moj-dashboard/kuhinja' }

   Webhook naj bo v HA local_only. Tokena tu NE sme biti: /local/ HA streze
   brez prijave. */
window.RECEPTI_NASTAVITVE = {
  webhook: '',
  seznam: '',
  webhookPecica: '',
  nazajPoti: {}
};
