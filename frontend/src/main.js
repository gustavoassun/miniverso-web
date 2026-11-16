import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Importa o arquivo que acabamos de criar
import './assets/styles/fonts.css';
import './assets/styles/global.css';

// Se você tiver um arquivo de CSS global, a importação fica aqui. 
// Exemplo: import './assets/styles/global.css';

const app = createApp(App);

app.use(router); // Injeta o Vue Router na aplicação
app.mount('#app'); // Monta o site na tela

// Abertura: o site aparece (e o nome "miniverso" começa a se abrir) só quando as fontes da capa já chegaram, para não
// nascer com a fonte reserva e trocar na frente da pessoa. Se demorar, em 1,5 s aparece assim mesmo.
const html = document.documentElement;
if (html.classList.contains('fonts-wait')) {
  const show = () => requestAnimationFrame(() => html.classList.remove('fonts-wait'));
  const fonts = ['700 1em "Random Grotesque"', '500 1em "Random Grotesque"', '400 1em "Random Grotesque"', '500 1em Thunder'].map(f => document.fonts.load(f));
  Promise.race([Promise.all(fonts), new Promise(r => setTimeout(r, 1500))]).then(show, show);
}
