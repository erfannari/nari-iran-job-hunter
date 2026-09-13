import { Keyboard } from 'grammy';

export function createMainMenuKeyboard(): Keyboard {
  return new Keyboard()
    .text('🎨 Top Design Jobs')
    .text('⭐ Saved Jobs')
    .row()
    .text('✅ Applied Tracker')
    .text('📊 Statistics')
    .row()
    .text('⚙️ Settings')
    .text('💼 Portfolio / CV')
    .text('📖 Help')
    .resized();
}
