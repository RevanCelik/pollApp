# Offene Aufgaben für die Poll-App

Stand: 6. Oktober 2026. Diese Liste hält die vom Benutzer ausgewählten Punkte aus der Prüfung der Poll-App-Checkliste und Code Conventions fest. Schrittweise umsetzen und erst nach Prüfung abhaken.

## Abgelaufene Umfragen

- [ ] Die zwei vom Benutzer bereits erstellten Umfragen am 7. Oktober 2026 prüfen: Sie sollen dann abgelaufen sein beziehungsweise ablaufen. Keine zusätzlichen abgelaufenen Testumfragen erforderlich. Bei einer Deadline am 7. Oktober bleibt die Umfrage nach der aktuellen Logik bis zum Tagesende aktiv und ist erst am 8. Oktober abgelaufen.
- [ ] Prüfen, dass abgelaufene Umfragen unter „Past survey“ erscheinen, separat nach Kategorie gefiltert werden können und weiterhin geöffnet werden können.
- [x] Antworten und Abschlussbutton in abgelaufenen Umfragen deaktiviert; Abgabe auch in der Anwendungslogik verhindert. Eindeutiger Hinweis „This survey has ended. Voting is closed.“ ergänzt. Die bestehende serverseitige Deadline-Prüfung bleibt bestehen. Am 7. Oktober mit Tests geprüft.
- [ ] Verifizieren, dass vergangene Umfragen lesbar bleiben und keine neue Stimme abgegeben werden kann.

## Echtzeitergebnisse

- [x] Ergebnisse automatisch aktualisieren, wenn andere Benutzer Stimmen abgeben. Supabase Realtime für `survey_responses` aktiviert; INSERT-Ereignisse der geöffneten Umfrage laden gespeicherte Ergebnisse nach. Eigene Stimmen werden ebenfalls aus der Datenbank nachgeladen, ohne doppelte lokale Zählung. LIVE erscheint nur bei verbundener, aktiver Umfrage.
- [x] Am 7. Oktober mit zwei unabhängigen Supabase-Clients und zwei Browser-Tabs geprüft: Stimme in Tab B erschien ohne Neuladen als 100 % in Tab A. Temporäre Testumfragen und Stimmen danach entfernt. Wiederverbindung lädt Ergebnisse nach; Entfernen der Verbindung und Ignorieren später callbacks durch Tests geprüft. 26 Tests bestanden.

## TypeScript Code Conventions

- [x] Funktionen und Methoden im Anwendungscode auf maximal 14 Zeilen reduziert, einschließlich Signatur und abschließender Klammer. `CreateSurvey.publish`, `SurveyStore.fetchSurveys`, `SurveyDetail.choose`, `SurveyDetail.complete` und weitere lange Methoden in klar benannte Teilaufgaben zerlegt. Nach Formatierung mit dem TypeScript-Parser geprüft, einschließlich Konstruktoren und Callback-Funktionen. Alle 20 Tests bestehen.
- [ ] Die 14-Zeilen-Regel für Test-Callbacks und Test-Fixtures separat prüfen; diese waren nicht Bestandteil des Refactorings des Anwendungscodes.
- [ ] Eine klar abgegrenzte Aufgabe pro Funktion sicherstellen.
- [ ] TSDoc-Kommentare für Funktionen und Methoden ergänzen. Auf ausdrücklichen Wunsch des Benutzers erst zum Schluss bearbeiten, nach den übrigen Änderungen.
- [ ] Explizite Typen und Rückgabetypen entsprechend den Vorgaben prüfen und ergänzen.
- [x] `$any(...)` im Home-Template durch eine typisierte Ereignisbehandlung ersetzen. `onCategoryFocusOut` prüft `HTMLElement` und `Node`, bevor es das Menü schließt.
- [x] Magic Numbers im Anwendungscode durch sprechende Konstanten in `src/app/survey.constants.ts` ersetzt: Antwortminimum/-maximum, Millisekunden pro Tag, Highlight-Anzahl, Prozentfaktor und Buchstabenkennzeichnung. Antwortlimit im Template und Hinweistext verwenden denselben Wert. Alle 20 vorhandenen Tests bestehen nach der Änderung.
- [ ] Konstantennamen gemäß Vorgabe in UPPER_CASE prüfen; Funktionen in camelCase, Klassen/Interfaces/Typen in PascalCase und Dateinamen in kebab-case beibehalten.
- [ ] TypeScript lesbar und einheitlich mit zwei Leerzeichen formatieren; lange Einzeiler auflösen und Imports gruppieren. Prüfung am 6. Oktober: lange Einzeiler im Anwendungscode und in `survey-detail.spec.ts` aufgelöst; die zuvor beanstandete providers-Zeile ist mehrzeilig formatiert. Importgruppierung separat offen.
- [ ] Semikolons, verständliche Bedingungen und ausgelagerte HTML-Templates prüfen.

## HTML Code Conventions

- [x] Pflichtfelder im Create-Survey-Formular ausdrücklich mit Stern und „Required fields“-Hinweis gekennzeichnet: Survey name, Category, alle Fragen und Antwortfelder. `required` vermittelt die Pflichtangabe auch an Screenreader. Beschreibung und Enddatum bleiben optional.

- [x] Templates einheitlich und lesbar einrücken; lange Einzeiler auflösen. Am 6. Oktober geprüft: HTML-Templates mehrzeilig formatiert; keine HTML-Zeile über 120 Zeichen. Die 120 Zeichen dienen nur als Prüfhilfe, nicht als Vorgabe der Dokumente.
- [ ] Semantik, Überschriftenhierarchie, Verschachtelung und sprechende englische Namen abschließend prüfen.
- [ ] Alt-Texte und verständliche, gepflegte Kommentare prüfen; Struktur und Darstellung getrennt halten.

## Prüfgrundlagen

- Poll-App Checkliste: `../Poll-App Checkliste.pdf`
- TypeScript: `C:/Users/revan/Downloads/Coding Konvention TypeScript.pdf`
- HTML: `C:/Users/revan/Downloads/Coding Convention HTML.pdf`

Die letzte Prüfung hatte 20 bestandene Tests. Visuelle Browserprüfungen sind weiterhin ausstehend. Diese Datei dokumentiert Aufgaben; sie bestätigt keine bereits erfolgte Umsetzung.

Prüfung vom 7. Oktober: 24 Tests bestanden. Fehlerhafte Aufrundung von gestern abgelaufenen Deadlines auf null Tage durch Kalendertagsvergleich ersetzt. Ein Enddatum am 6. Oktober ist am 7. Oktober abgelaufen und wird aus Active/Ending soon ausgeschlossen. Visuelle Prüfung der konkreten beiden Surveys und ihrer Kategorienfilter bleibt offen.
