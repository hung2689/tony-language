import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarFrame from '../../../components/common/AvatarFrame';

describe('AvatarFrame Component', () => {
  it('renders initials fallback when no image src is provided', () => {
    const html = renderToStaticMarkup(<AvatarFrame name="Nguyen Van A" tierId={1} />);
    expect(html).toContain('avatar-frame-initials');
    expect(html).toContain('NA');
  });

  it('correctly maps tier string to numeric tier class', () => {
    const html = renderToStaticMarkup(
      <AvatarFrame name="Test User" tierId="TIER_5_PLATINUM" />
    );
    expect(html).toContain('tier-5');
  });

  it('renders crown icon badge specifically for tier 8', () => {
    const html = renderToStaticMarkup(
      <AvatarFrame name="Master User" tierId="TIER_8_MYTHIC" />
    );
    expect(html).toContain('tier-8-crown-badge');
    expect(html).toContain('tier-8');
  });

  it('does not render crown for tiers below 8', () => {
    const html = renderToStaticMarkup(
      <AvatarFrame name="Gold User" tierId={4} />
    );
    expect(html).not.toContain('tier-8-crown-badge');
  });

  it('renders image with proper alt text when src is provided', () => {
    const html = renderToStaticMarkup(
      <AvatarFrame
        name="John Doe"
        tierId={2}
        src="https://example.com/avatar.png"
      />
    );
    expect(html).toContain('avatar-frame-image');
    expect(html).toContain('alt="Ảnh đại diện của John Doe"');
  });

  it('supports size classes correctly', () => {
    const htmlSm = renderToStaticMarkup(<AvatarFrame size="sm" />);
    expect(htmlSm).toContain('size-sm');

    const htmlXl = renderToStaticMarkup(<AvatarFrame size="xl" />);
    expect(htmlXl).toContain('size-xl');
  });
});
