import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Importa o arquivo que acabamos de criar
import './assets/styles/global.css';

// Se você tiver um arquivo de CSS global, a importação fica aqui. 
// Exemplo: import './assets/styles/global.css';

const app = createApp(App);

app.use(router); // Injeta o Vue Router na aplicação
app.mount('#app'); // Monta o site na tela