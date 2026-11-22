// Static rendering: renderToString runs the same renderers against a DOM
// shim, with no browser, as it does in Node. Code that imports
// 'swiftui-for-web/server' runs in a Worker here; export the HTML string
// and the Playground shows it.
import { VStack, HStack, Text, Button, Image, Color, Font } from 'swiftui-for-web';
import { renderToString } from 'swiftui-for-web/server';

const ArticleCard = () =>
  VStack({ alignment: 'leading', spacing: 8 },
    Text('Static rendering in 3.1')
      .font(Font.title2)
      .accessibilityHeading('h1'),
    Text('Crawlers and link previews see this markup without running JavaScript.')
      .foregroundColor(Color.secondary),
    HStack({ spacing: 8 },
      Image.systemName('star.fill').foregroundColor(Color.orange),
      Button('Read more', () => {})
    )
  )
  .padding(16)
  .background(Color.secondarySystemBackground)
  .cornerRadius(12);

const html = renderToString(ArticleCard());
console.log(`renderToString returned ${html.length} characters`);

export default html;
