import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CardBack } from '../../../components/card/CardBack';
import { OpponentSeat } from '../../../components/board/OpponentSeat';
import { GamePlayer } from '../types';
import {
  createCardBackDOMElement,
  launchOpponentPlayOverlay,
  launchOpponentDrawOverlay,
} from '../cardAnimation';

describe('CardBack Component', () => {
  it('renders Light Side card back with authentic styling and logos', () => {
    const html = renderToString(<CardBack side="light" size="md" />);
    expect(html).toContain('UNO');
    expect(html).toContain('FLIP!');
    expect(html).toContain('bg-white');
    expect(html).toContain('text-[#FFCC00]');
  });

  it('renders Dark Side card back with authentic styling and logos', () => {
    const html = renderToString(<CardBack side="dark" size="md" />);
    expect(html).toContain('UNO');
    expect(html).toContain('FLIP!');
    expect(html).toContain('bg-[#111418]');
    expect(html).toContain('text-[#00E5FF]');
  });

  it('never renders private card faces or values', () => {
    const lightHtml = renderToString(<CardBack side="light" size="sm" />);
    const darkHtml = renderToString(<CardBack side="dark" size="sm" />);
    
    // Check that numeric faces, color tags or private fields are not present
    expect(lightHtml).not.toContain('reverse');
    expect(lightHtml).not.toContain('skip');
    expect(lightHtml).not.toContain('draw_two');
    expect(darkHtml).not.toContain('draw_five');
  });

  it('supports size presets and custom width/height', () => {
    const xsHtml = renderToString(<CardBack side="light" size="xs" />);
    expect(xsHtml).toContain('w-6');

    const customHtml = renderToString(
      <CardBack side="dark" size="custom" width={40} height={60} />
    );
    expect(customHtml).toContain('width:40px');
    expect(customHtml).toContain('height:60px');
  });
});

describe('OpponentSeat Component', () => {
  const basePlayer: GamePlayer = {
    id: 'gp-1',
    room_id: 'room-1',
    profile_id: 'user-2',
    seat_index: 1,
    is_host: false,
    is_ready: true,
    is_connected: true,
    card_count: 5,
    has_called_uno: false,
    profile: {
      id: 'user-2',
      nickname: 'Bob',
      avatar_color: '#1677E8',
      created_at: new Date().toISOString(),
    },
  };

  it('renders opponent name, avatar, and exact server card count', () => {
    const html = renderToString(
      <OpponentSeat
        player={basePlayer}
        isCurrentTurn={false}
        activeSide="light"
        position="top"
      />
    );

    expect(html).toContain('Bob');
    expect(html).toContain('B'); // Avatar initial
    expect(html).toContain('5');
    expect(html).toContain('cards');
    expect(html).toContain('UNO'); // CardBack logo in stack
  });

  it('renders a maximum of 3 overlapping cards in the stack even when count is large', () => {
    const largeHandPlayer: GamePlayer = { ...basePlayer, card_count: 14 };
    const html = renderToString(
      <OpponentSeat
        player={largeHandPlayer}
        isCurrentTurn={false}
        activeSide="light"
        position="top"
      />
    );

    // Count instances of CardBack root elements in stack
    const unoOccurrences = (html.match(/UNO/g) || []).length;
    // Exactly 3 cards in stack
    expect(unoOccurrences).toBe(3);
    // Real count 14 is displayed in count badge
    expect(html).toContain('14');
  });

  it('displays singular "card" and prominent UNO! badge when count is exactly 1', () => {
    const oneCardPlayer: GamePlayer = {
      ...basePlayer,
      card_count: 1,
      has_called_uno: true,
    };
    const html = renderToString(
      <OpponentSeat
        player={oneCardPlayer}
        isCurrentTurn={false}
        activeSide="light"
        position="top"
      />
    );

    expect(html).toContain('1');
    expect(html).toContain('card');
    expect(html).toContain('UNO!');
    // 1 card back in stack
    const unoOccurrences = (html.match(/FLIP!/g) || []).length;
    expect(unoOccurrences).toBe(1);
  });

  it('displays Catch! challenge button when player has 1 card and is vulnerable', () => {
    const vulnerablePlayer: GamePlayer = {
      ...basePlayer,
      card_count: 1,
      has_called_uno: false,
    };
    const html = renderToString(
      <OpponentSeat
        player={vulnerablePlayer}
        isCurrentTurn={false}
        activeSide="dark"
        isVulnerable={true}
        onChallengeUno={vi.fn()}
        position="left"
      />
    );

    expect(html).toContain('Catch!');
    expect(html).toContain('UNO!');
  });

  it('displays turn indicator when it is the opponent\'s turn', () => {
    const html = renderToString(
      <OpponentSeat
        player={basePlayer}
        isCurrentTurn={true}
        activeSide="light"
        position="right"
      />
    );

    expect(html).toContain('Turn');
    expect(html).toContain('border-[#FFCC00]');
  });

  it('displays Disconnected badge when opponent connection is lost', () => {
    const disconnectedPlayer: GamePlayer = {
      ...basePlayer,
      is_connected: false,
      disconnected_at: new Date().toISOString(),
    };
    const html = renderToString(
      <OpponentSeat
        player={disconnectedPlayer}
        isCurrentTurn={false}
        activeSide="light"
        position="top"
      />
    );

    expect(html).toContain('Disconnected');
  });

  it('switches card-back styling between Light and Dark side for opponents', () => {
    const lightHtml = renderToString(
      <OpponentSeat
        player={basePlayer}
        isCurrentTurn={false}
        activeSide="light"
        position="top"
      />
    );
    const darkHtml = renderToString(
      <OpponentSeat
        player={basePlayer}
        isCurrentTurn={false}
        activeSide="dark"
        position="top"
      />
    );

    expect(lightHtml).toContain('bg-white');
    expect(darkHtml).toContain('bg-[#111418]');
  });
});

describe('Opponent Animation Helpers', () => {
  it('creates DOM element with proper UNO FLIP card-back structure', () => {
    const originalDocument = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: () => {
        const el: any = {
          className: '',
          style: {},
          innerHTML: '',
          children: [] as any[],
          appendChild: function (child: any) {
            el.children.push(child);
            el.innerHTML += child.innerHTML || child.innerText || '';
            return child;
          },
        };
        return el;
      },
    };

    try {
      const elLight = createCardBackDOMElement('light', 32, 48);
      expect(elLight.style.width).toBe('32px');
      expect(elLight.style.height).toBe('48px');
      expect(elLight.className).toContain('bg-white');

      const elDark = createCardBackDOMElement('dark', 30, 44);
      expect(elDark.style.width).toBe('30px');
      expect(elDark.style.height).toBe('44px');
      expect(elDark.className).toContain('bg-[#111418]');
    } finally {
      (globalThis as any).document = originalDocument;
    }
  });

  it('launchOpponentPlayOverlay handles missing elements gracefully', () => {
    const result = launchOpponentPlayOverlay(null, 'light');
    expect(result).toBe(false);
  });

  it('launchOpponentDrawOverlay handles missing elements gracefully', () => {
    const result = launchOpponentDrawOverlay(null, 'dark');
    expect(result).toBe(false);
  });
});
