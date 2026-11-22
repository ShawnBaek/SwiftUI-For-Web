// Gestures and animation: drag, long press, a high-priority tap, and a
// view that animates in and out with .transition inside withAnimation.
import {
  App, VStack, HStack, Text, Button, Show, Spacer, State, DragGesture, TapGesture,
  withAnimation, Animation, AnyTransition, Color, Font
} from 'swiftui-for-web';

const offset = new State({ width: 0, height: 0 });
const pressed = new State(false);
const showCard = new State(true);
const taps = new State(0);

let card = null; // the dragged element, kept by a custom modifier

const DragCard = () =>
  Text('Drag me')
    .padding(20)
    .background(Color.blue)
    .foregroundColor(Color.white)
    .cornerRadius(12)
    .modifier((element) => { card = element; })
    .gesture(
      DragGesture({ minimumDistance: 2 })
        .onChanged((value) => {
          offset.value = value.translation;
          card.style.transform = `translate(${value.translation.width}px, ${value.translation.height}px)`;
        })
        .onEnded(() => {
          withAnimation(Animation.spring(), () => { offset.value = { width: 0, height: 0 }; });
          card.animate([{ transform: card.style.transform }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
          card.style.transform = '';
        })
    );

const ContentView = () =>
  VStack({ spacing: 18 },
    Text('Gestures').font(Font.title2),
    DragCard(),
    Text(() => `Translation: ${Math.round(offset.value.width)} × ${Math.round(offset.value.height)}`)
      .foregroundColor(Color.secondary)
      .monospacedDigit(),

    Text(() => (pressed.value ? 'Long-pressed!' : 'Press and hold'))
      .padding(14)
      .background(Color.orange)
      .foregroundColor(Color.white)
      .cornerRadius(10)
      .onLongPressGesture(() => { pressed.value = !pressed.value; }, { minimumDuration: 0.5 }),

    // The parent's high-priority tap wins over the child's own tap.
    HStack({ spacing: 8 },
      Text('Inner tap').padding(8).background(Color.secondarySystemBackground).onTapGesture(() => {}),
      Spacer(),
      Text(() => `Outer taps: ${taps.value}`)
    )
      .padding(10)
      .border(Color.gray, 1)
      .frame({ width: 260 })
      .highPriorityGesture(TapGesture().onEnded(() => { taps.value += 1; })),

    Button(Text(() => (showCard.value ? 'Hide card' : 'Show card')), () => {
      withAnimation(Animation.easeInOut(0.3), () => { showCard.value = !showCard.value; });
    }),
    Show(() => showCard.value,
      Text('Hello!')
        .padding(16)
        .background(Color.purple)
        .foregroundColor(Color.white)
        .cornerRadius(12)
        .transition(AnyTransition.scale(0.5).combined(AnyTransition.opacity))
    )
  )
  .padding(24);

App(ContentView).mount('#root');
