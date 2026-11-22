// Hello World: text, a stack and modifiers.
import { App, VStack, Text, Color, Font } from 'swiftui-for-web';

const ContentView = () =>
  VStack({ spacing: 12 },
    Text('Hello, SwiftUI for Web!')
      .font(Font.largeTitle)
      .foregroundColor(Color.blue),
    Text('Edit the code: the preview updates as you type.')
      .font(Font.subheadline)
      .foregroundColor(Color.secondary)
  )
  .padding(32);

App(ContentView).mount('#root');
