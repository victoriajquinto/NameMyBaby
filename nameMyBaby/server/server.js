import express from 'express';
import morgan from 'morgan';
import {db} from './database/db.mjs';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import NodePolyfillPlugin from 'vite-plugin-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
dotenv.config();
export const PORT = process.env.PORT;


const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom'
})

  // Use vite's connect instance as middleware. If you use your own
  // express router (express.Router()), you should use router.use
app.use(vite.middlewares)


app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
app.use(express.urlencoded({ extended: true }));


app.use('*', async (req, res, next) => {
  const url = req.originalUrl;
  try {
    // 1. Read index.html
    let template = fs.readFileSync(
      path.resolve(__dirname, 'index.html'),
      'utf-8',
    )

    // 2. Apply Vite HTML transforms. This injects the Vite HMR client,
    //    and also applies HTML transforms from Vite plugins, e.g. global
    //    preambles from @vitejs/plugin-react
    template = await vite.transformIndexHtml(url, template)

    // 3. Load the server entry. ssrLoadModule automatically transforms
    //    ESM source code to be usable in Node.js! There is no bundling
    //    required, and provides efficient invalidation similar to HMR.
    const { render } = await vite.ssrLoadModule('/src/entry-server.js')

    // 4. render the app HTML. This assumes entry-server.js's exported
    //     `render` function calls appropriate framework SSR APIs,
    //    e.g. ReactDOMServer.renderToString()
    const appHtml = await render(url)

    // 5. Inject the app-rendered HTML into the template.
    const html = template.replace(`<!--app-html-->`, appHtml)

    // 6. Send the rendered HTML back.
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
  } catch (e) {
    // If an error is caught, let Vite fix the stack trace so it maps back
    // to your actual source code.
    vite.ssrFixStacktrace(e)
    next(e)
  }
})


//ROUTES

app.get('/hi', (req, res) => {
  res.send('Hello from Express!').status(200);
});

app.get('/popularity', async(req, res) => {
  try{
    const name = req.query.name || "Victoria";
    const queryString = 'SELECT year, count FROM popularity WHERE name = $1';
    const data = await db.query(queryString, [name])
    res.status(200).send(data);
  } catch (error) {
    console.log('error in pop get request', error);
    res.status(400).send(error);
  }
});

app.get('/topten', async(req, res) => {
  try {
    const year = parseInt(req.query.year);
    const gender = req.query.gender.toUpperCase();
    const params = [year, gender];
    console.log('req in topten server path', req.query);
    const queryString = 'SELECT name FROM popularity WHERE (year = $1 AND gender = $2) ORDER BY count DESC LIMIT 10;';
    const data = await db.query(queryString, params);
    res.status(200).send(data);
  } catch (error) {
    console.log('error in pop get request', error);
    res.status(400).send(error);
  }
});

app.get('/wiki-proxy', async (req, res) => {
  const pageTitle = req.query.title;
  console.log('Requesting Wikipedia page:', pageTitle);
  try {
    const response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        prop: 'extracts',
        exintro: '',
        explaintext: '',
        titles: pageTitle,
      },
    });

    const pageId = Object.keys(response.data.query.pages)[0];
    const summary = response.data.query.pages[pageId].extract;
    res.status(200).send(summary);
  } catch (error) {
    console.error('Error fetching Wikipedia:', error.message);
    res.status(400).send(error.message);
  }
});

app.get('/wiki-given-names', async (req, res) => {
  const title = req.query.title;
  const wikipediaURL = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

  try {
    const response = await axios.get(wikipediaURL);
    const html = response.data;
    res.send(html);
  } catch (error) {
    console.error('Error fetching the Wikipedia page:', error.message);
    res.status(500).send('Error fetching the Wikipedia page.');
  }
});

app.get('/favorites', async (req, res) => {
  try {
    const queryString = 'SELECT * FROM favorites'
    const data = await db.query(queryString);
    res.status(200).send(data);

  } catch (error) {
    console.error('Server error getting favorites:', error.message);
    res.status(400).send('Server error getting favorites:');
  }
});

app.post('/favorites', async (req, res) => {
  const name = req.body.name;
  const gender = req.body.gender;
  try {
    const values = [name, gender];
    console.log(values);
    const queryString = 'INSERT INTO favorites (name, gender) VALUES ($1, $2)';
    await db.query(queryString, values);
    res.status(201).send(`${name} inserted successfully`); //TODO
  } catch (error) {
    console.error('Server error posting name to favorites:', error.message);
    res.status(401).send('Server error posting name to favorites');
  }
});

app.delete('/favorites/:name/:gender', async (req, res) => {
  const name = req.params.name;
  const gender = req.params.gender;
  console.log('name and gender: ', name, gender);
  try {
    const values = [name, gender];
    const queryString = 'DELETE FROM favorites WHERE (name = $1 AND gender = $2)';
    const data = await db.query(queryString, values);
    res.status(200).send(`successfully deleted ${name}. Data: ${data}`);
  } catch (error) {
    console.error('Server error deleting name from favorites:', error.message);
    res.status(401).send('Server error deleting name from favorites');

  }
});

app.listen(PORT, () => {
  console.log("server listening on port", PORT);
});

// createServer()
//   .then((app) =>
//     app.listen(port, () => {
//       console.log(`express server live and listening on http://localhost:${port}`)
//     }),
//   )