import 'react-native-gesture-handler';
import './src/lib/textScaling'; // side effect: app-wide Dynamic Type cap — must run before App
import { registerRootComponent } from 'expo';
import App from './src/App';
registerRootComponent(App);
