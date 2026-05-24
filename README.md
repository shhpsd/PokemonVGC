# Pokemon Champions — Página de prueba (VGC)

Pequeña página de prueba para iterar sobre ideas de una app web de VGC.

Archivos:
- `index.html` — Interfaz principal.
- `styles.css` — Estilos.
- `app.js` — Lógica: generación de equipos, pokédex reducida y almacenamiento de campeones en localStorage.

Cómo probar localmente:

1. Abrir `index.html` en el navegador (doble clic o `Live Server`).
2. Usar el buscador para añadir pokémon al equipo.
3. Generar equipos con "Generar equipo aleatorio".
4. Añadir campeones en el formulario; se guardan en `localStorage`.

Funcionalidades añadidas:
- `Entrenamiento` — Modo `Flashcards` y `Quiz` para practicar conceptos básicos (nombre y tipos).
- Configuración de `difficulty` (por ahora sólo indicativa: `Básico` y `Avanzado`).

Ideas siguientes (puedo implementarlas si quieres):
- Preguntas avanzadas: EV/IV, sinergias de equipo, resistencias y counters.
- Modo entrenador avanzado: simulador de partidas, counters recomendados por rol.
- Expandir la Pokédex con sprites y datos reales desde una API.

Si quieres que implemente alguna de las ideas, dime cuál y la agrego.

Modo de inicio:
- Al abrir la página aparece una pantalla inicial para elegir `Quiz`, `Flashcards` o `Equipo`.
- La creación de equipos y la Pokédex sólo estarán disponibles si eliges `Equipo` en la pantalla inicial.

Notas técnicas:
- El quiz usa datos de PokeAPI para obtener sprites y tipos cuando sea posible y los guarda en `localStorage` para acelerar.
- Si quieres que precargue todos los datos del banco de preguntas para mejorar latencia, puedo añadir esa opción (hará muchas peticiones iniciales).

Uso de IDs (Pokédex):
- Ahora `getPokemonData` acepta un número de Pokédex además del nombre. Si quieres asegurar que la API encuentre la imagen (y evitar ambigüedades de nombres), añade la propiedad `id` a las entradas en `questions.js`.

Ejemplo de `questions.js` con id:
```
{ name: 'Pikachu', id: 25 }
```

Cuando `makeQuiz` detecta `id` en una entrada, consultará `https://pokeapi.co/api/v2/pokemon/{id}` para obtener el sprite y tipos.
