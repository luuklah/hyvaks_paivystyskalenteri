# Päivystyskalenteri (MVP / demo)

Kevyt, suomenkielinen selain-MVP päivystysvuorojen varaamiseen ja vuoron jälkeisten päivystysilmoitusten käsittelyyn. Sovellus on tarkoitettu käyttöliittymä- ja työnkulkudemonstraatioksi.

## Käynnistys

Ei asennettavia riippuvuuksia tai build-vaihetta. Avaa `index.html` selaimessa (tai tarjoa hakemisto esimerkiksi `python -m http.server` -komennolla). Toimii moderneilla selaimilla, joissa on `localStorage`, `Blob` ja `FormData`.

## Käyttöpolku

1. Kirjaudu sisään jommallakummalla alla olevalla demotunnuksella.
2. Päivystäjä avaa **Vuorokalenterin**, vaihtaa tarvittaessa viikko- ja kuukausinäkymän välillä, varaa vapaan vuoron ja täyttää oman ilmoituksensa. Kalenterissa on kuluvan kuukauden lisäksi kolme seuraavaa kuukautta. Uusimmassa avoimessa kuukaudessa voi olla enintään kaksi omaa varausta; vanhempien avoimien kuukausien varaukset eivät kuluta tämän kuukauden kiintiötä. Varauksen voi perua 15 minuutin ajan.
3. Päivystysilmoituksessa täytetään toteutuneiden aikojen lisäksi potilasmäärät luokille **Kiireellinen**, **Perustaso** ja **Triage/Puhelinlääkäri**. Lomake näyttää luokkien summan.
4. Lomakkeessa hälytyskorvaus syötetään edelleen käsin ja ruuhkan purku valitaan erikseen. Peruskorvaus näytetään viikonlopulle ja listatuille pyhäpäiville vain avoimena demo-laskentana.
   Päivystysilmoitus näyttää kirjautuneen käyttäjän nimen, käyttäjätunnuksen ja roolin sekä vuoropäivän lukittuina tietoina. Toteutuneista ajoista muokataan vain kellonaikoja; yövuoron lopetus validoidaan seuraavan kalenteripäivän puolella.
   Lääkäri kuittaa toteuman **Allekirjoita toteuma** -painikkeella ennen lähettämistä. Esihenkilö voi kuitata lähetetyn ilmoituksen omalla **Allekirjoita**-painikkeellaan. Nimi, käyttäjätunnus ja aika näkyvät molemmille.
5. Esihenkilö näkee kalenterissa kaikki vapaat ja varatut vuorot sekä voi selata historiallisia kuukausia. Varatun vuoron voi tyhjentää tai siirtää pudotusvalikosta valitulle demo-päivystäjälle. Päivää napsauttamalla avautuu **Päivän tiedot** -näkymä, jossa näkyvät vuorot ja varausloki.
6. Lääkäri voi lähettää oman varauksensa peruutuspyynnön pakollisella syyllä. Varaus säilyy, kunnes esihenkilö käsittelee pyynnön. Esihenkilö käsittelee pyynnöt **Peruutuspyynnöt**-hallintapaneelissa.
7. Esihenkilö avaa **Käsittelyjonon**, palauttaa ilmoituksen korjattavaksi tai hyväksyy sen.
8. Hyväksytyt ilmoitukset voi ladata CSV:nä. CSV sisältää potilasluokat, kokonaismäärän sekä demo-peruskorvauksen. **Tapahtumaloki** näyttää muutokset.

## Demotunnukset

| Käyttäjä | Tunnus | Salasana | Oikeudet |
| --- | --- | --- | --- |
| Minna Laine | `lääkäri` | `demo123` | Voi katsella ja varata vapaita vuoroja sekä täyttää, lähettää ja korjata omia ilmoituksia |
| Mikko Virtanen | `mikko` | `demo123` | Demo-päivystäjä, jonka voi valita siirron vastaanottajaksi |
| Laura Niemi | `laura` | `demo123` | Demo-päivystäjä, jonka voi valita siirron vastaanottajaksi |
| Sari Esihenkilö | `esihenkilö` | `demo123` | Voi käsitellä ilmoitusjonon, hyväksyä/palauttaa ilmoituksia ja viedä hyväksytyt CSV:nä |

Käyttäjän voi vaihtaa oikean yläkulman **Vaihda käyttäjää** -toiminnolla.

## MVP:n rajaus

- Tiedot, kirjautunut käyttäjä, kirjautumisaika ja varausajat säilyvät vain selaimen paikallisessa muistissa; **Palauta demo** tyhjentää tehdyt muutokset mutta säilyttää aktiivisen kirjautumisen.
- Kirjautuminen ja roolirajoitukset ovat käyttöliittymän MVP-demoa, eivät palvelintason tietoturvaa. Älä käytä oikeita tunnuksia tai henkilötietoja.
- Päivystäjä näkee varaajan nimen kalenterissa ja voi perua oman uuden varauksensa vain 15 minuutin kuluessa. Esihenkilö ei voi varata vuoroja.
- Esihenkilö voi kalenterissa tyhjentää muiden varauksia tai siirtää vuoron valitulle demo-päivystäjälle. Muutokset kirjataan tapahtuma- ja varauslokiin; siirto päivittää myös ilmoituksen omistajan. Esihenkilöön ei sovelleta päivystäjän varauskiintiötä.
- Mukana on demoaineisto, responsiivinen kalenteri, lomakkeen validointi, tilat `luonnos`, `lähetetty`, `korjattava`, `hyväksytty` ja CSV-vienti.
- Jokainen neljän avoimen kuukauden demopäivä sisältää kolme peräkkäistä vuoroa (00–08, 08–16 ja 16–24), jotka kattavat koko vuorokauden ilman päällekkäisyyksiä. Vanha localStorage-aineisto muunnetaan tähän rakenteeseen ja vanhat varaukset säilytetään.
- Peruutuspyynnöt, niiden syyt ja käsittelytilat säilyvät localStoragessa sekä booking-/tapahtumalokeissa.
- Allekirjoitukset ovat vain localStorageen tallennettavia demo-kuittauksia, eivät vahvoja sähköisiä allekirjoituksia tai oikeudellisesti sitovia tunnisteita. Vanha ilmoitusdata saa puuttuvat allekirjoituskentät tyhjinä.
- Kalenterissa on responsiivinen viikko- ja kuukausinäkymä. Päivystäjä on rajattu neljän kuukauden varausikkunaan, mutta esihenkilö voi selata historiallisia kuukausia (sekä kohtuullista tulevaa aluetta). Varausloki säilyttää varaukset, peruutukset, vapautukset ja siirrot ja sille on päivän tarkastelunäkymä. Vanhan localStorage-datan puuttuva loki alustetaan tyhjäksi.
- Demo-peruskorvauksen hinnat ovat esimerkkejä (arki 100 €, viikonloppu 150 €, listattu pyhä 200 €), eivät palkkalaskennan sääntöjä.
- Tuotantokäyttö vaatisi palvelimen, tunnistautumisen, tietosuojan, tietokannan, ilmoitusintegraatiot ja vahvemman auditoinnin. **Palkkalaskenta- tai SAP-integraatio ei kuulu tähän MVP:hen**, eikä demo-korvausta tule käyttää tuotannon palkkatietona.

Älä syötä demoon oikeita henkilötietoja.
