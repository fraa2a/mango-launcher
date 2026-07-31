# Mango Custom Download Source

Mango Launcher recognizes files ending in `.mangocds` as custom download source
packages. The file is UTF-8 JSON:

```json
{
  "format": "mangocds",
  "version": 1,
  "name": "Example source",
  "url": "https://example.org/download-sources/mango.json",
  "description": "Optional description",
  "author": "Optional author"
}
```

Only `format`, `version`, and `url` are currently used for importing. The URL
must use `http` or `https`. Mango validates the file, adds the source through
the normal catalogue API, ignores duplicate URLs, and opens Download Sources
after a successful import.

Websites can also use the existing browser integration:

`mangolauncher://install-source?urls=https%3A%2F%2Fexample.org%2Fdownload-sources%2Fmango.json`
