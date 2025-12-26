import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { srConfig } from '@config';
import sr from '@utils/sr';
import { usePrefersReducedMotion } from '@hooks';

// Face tracker configuration
const P_MIN = -15;
const P_MAX = 15;
const STEP = 3;
const SIZE = 256;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const quantizeToGrid = val => {
  const raw = P_MIN + ((val + 1) * (P_MAX - P_MIN)) / 2;
  const snapped = Math.round(raw / STEP) * STEP;
  return clamp(snapped, P_MIN, P_MAX);
};

const sanitize = val => {
  const str = Number(val).toFixed(1);
  return str.replace('-', 'm').replace('.', 'p');
};

const gridToFilename = (px, py) => `gaze_px${sanitize(px)}_py${sanitize(py)}_${SIZE}.webp`;

// Preload all face images
const preloadFaceImages = () => {
  for (let px = P_MIN; px <= P_MAX; px += STEP) {
    for (let py = P_MIN; py <= P_MAX; py += STEP) {
      const img = new Image();
      img.src = `/faces/${gridToFilename(px, py)}`;
    }
  }
};

// "Curious Observer" animation sequence for mobile
// Each keyframe: [px, py, duration in ms]
// Duration is the total time to interpolate TO this position
const FACE_ANIMATION_KEYFRAMES = [
  // Quick scan left-right
  [0, 0, 200],
  [-15, 0, 250],
  [15, 0, 300],
  [0, 0, 200],
  // Dart up-right, track something
  [12, -12, 150],
  [15, -15, 100],
  [15, -15, 300], // Hold - spotted something!
  [9, -9, 150],
  [3, -3, 150],
  [-6, 6, 200],
  [-12, 9, 150],
  [-15, 12, 150],
  // Quick double-take
  [0, 0, 100],
  [-9, -6, 100],
  [0, 0, 100],
  [-9, -6, 150],
  [-9, -6, 250], // Hold
  // Full eye roll
  [-15, 0, 150],
  [-15, -9, 150],
  [-9, -15, 150],
  [0, -15, 150],
  [9, -15, 150],
  [15, -9, 150],
  [15, 0, 150],
  [9, 9, 150],
  [0, 12, 150],
  [-6, 6, 150],
  // Intense focus center
  [0, 0, 100],
  [0, 0, 600], // Eye contact hold
  // Startled look around
  [15, -15, 100],
  [-15, -15, 150],
  [-15, 15, 150],
  [15, 15, 150],
  [15, -15, 150],
  [0, 0, 100],
  // Reading something left to right
  [-15, -3, 200],
  [-9, -3, 150],
  [-3, -3, 150],
  [3, -3, 150],
  [9, -3, 150],
  [15, -3, 150],
  // New line
  [-15, 0, 100],
  [-9, 0, 150],
  [-3, 0, 150],
  [3, 0, 150],
  [9, 0, 150],
  [15, 0, 150],
  // Bored look up
  [0, -15, 300],
  [0, -15, 400], // Hold - thinking
  [3, -12, 200],
  [-3, -12, 200],
  // Quick glances
  [-15, 6, 100],
  [15, -6, 150],
  [-12, -12, 100],
  [12, 12, 150],
  [0, 0, 100],
  // Suspicious squint (small movements)
  [-3, 0, 200],
  [-6, -3, 200],
  [-6, -3, 300], // Hold
  [0, 0, 150],
  // Big sweep
  [-15, -15, 200],
  [0, -15, 150],
  [15, -15, 150],
  [15, 0, 150],
  [15, 15, 150],
  [0, 15, 150],
  [-15, 15, 150],
  [-15, 0, 150],
  [-15, -15, 150],
  // Return center
  [0, 0, 200],
  [0, 0, 300], // Brief rest
];

// Generate smooth path between two positions using Bresenham-style stepping
const generatePath = (fromPx, fromPy, toPx, toPy) => {
  const path = [];
  let x = fromPx;
  let y = fromPy;

  while (x !== toPx || y !== toPy) {
    // Move one step closer on each axis
    if (x < toPx) {
      x += STEP;
    } else if (x > toPx) {
      x -= STEP;
    }

    if (y < toPy) {
      y += STEP;
    } else if (y > toPy) {
      y -= STEP;
    }

    path.push([x, y]);
  }

  // Ensure we have at least one frame (for holds)
  if (path.length === 0) {
    path.push([toPx, toPy]);
  }

  return path;
};

// Build the full animation with all grid positions
const buildFullAnimation = () => {
  const frames = [];
  let prevPx = 0;
  let prevPy = 0;

  for (const [toPx, toPy, duration] of FACE_ANIMATION_KEYFRAMES) {
    const path = generatePath(prevPx, prevPy, toPx, toPy);
    const timePerFrame = duration / path.length;

    for (const [px, py] of path) {
      frames.push({ px, py, duration: timePerFrame });
    }

    prevPx = toPx;
    prevPy = toPy;
  }

  return frames;
};

const ANIMATION_FRAMES = buildFullAnimation();

const StyledAboutSection = styled.section`
  max-width: 900px;

  .inner {
    display: grid;
    grid-template-columns: 3fr 2fr;
    grid-gap: 50px;

    @media (max-width: 768px) {
      display: block;
    }
  }
`;
const StyledText = styled.div`
  ul.skills-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(140px, 200px));
    grid-gap: 0 10px;
    padding: 0;
    margin: 20px 0 0 0;
    overflow: hidden;
    list-style: none;

    li {
      position: relative;
      margin-bottom: 10px;
      padding-left: 20px;
      font-family: var(--font-mono);
      font-size: var(--fz-xs);

      &:before {
        content: '▹';
        position: absolute;
        left: 0;
        color: var(--green);
        font-size: var(--fz-sm);
        line-height: 12px;
      }
    }
  }
`;
const StyledPic = styled.div`
  position: relative;
  max-width: 300px;

  @media (max-width: 768px) {
    margin: 50px auto 0;
    width: 70%;
  }

  .wrapper {
    ${({ theme }) => theme.mixins.boxShadow};
    display: block;
    position: relative;
    width: 100%;
    border-radius: var(--border-radius);
    background-color: var(--green);

    &:hover,
    &:focus {
      outline: 0;
      transform: translate(-4px, -4px);

      &:after {
        transform: translate(8px, 8px);
      }

      .img {
        filter: none;
        mix-blend-mode: normal;
      }
    }

    .img {
      position: relative;
      border-radius: var(--border-radius);
      mix-blend-mode: multiply;
      filter: grayscale(100%) contrast(1);
      transition: var(--transition);
    }

    &:before,
    &:after {
      content: '';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: var(--border-radius);
      transition: var(--transition);
    }

    &:before {
      top: 0;
      left: 0;
      background-color: var(--navy);
      mix-blend-mode: screen;
    }

    &:after {
      border: 2px solid var(--green);
      top: 14px;
      left: 14px;
      z-index: -1;
    }
  }
`;

const About = () => {
  const revealContainer = useRef(null);
  const faceContainerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Initialize with center-looking image
  const [faceSrc, setFaceSrc] = useState('/faces/gaze_px0p0_py0p0_256.webp');

  const updateFaceFromClient = useCallback((clientX, clientY) => {
    if (!faceContainerRef.current) {
      return;
    }

    const rect = faceContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const nx = (clientX - centerX) / (rect.width / 2);
    const ny = (centerY - clientY) / (rect.height / 2);

    const clampedX = clamp(nx, -1, 1);
    const clampedY = clamp(ny, -1, 1);

    const px = quantizeToGrid(clampedX);
    const py = quantizeToGrid(clampedY);

    const filename = gridToFilename(px, py);
    setFaceSrc(`/faces/${filename}`);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    sr.reveal(revealContainer.current, srConfig());
  }, []);

  // Preload face images on mount
  useEffect(() => {
    preloadFaceImages();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleMouseMove = e => updateFaceFromClient(e.clientX, e.clientY);

    // Animation loop for mobile (uses full grid path for smooth movement)
    let frameIndex = 0;
    let animationId = null;
    let lastTime = 0;
    let accumulated = 0;

    const animate = timestamp => {
      if (!lastTime) {
        lastTime = timestamp;
      }
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      accumulated += delta;

      const frame = ANIMATION_FRAMES[frameIndex];

      if (accumulated >= frame.duration) {
        accumulated = 0;
        frameIndex = (frameIndex + 1) % ANIMATION_FRAMES.length;

        const nextFrame = ANIMATION_FRAMES[frameIndex];
        const filename = gridToFilename(nextFrame.px, nextFrame.py);
        setFaceSrc(`/faces/${filename}`);
      }

      animationId = requestAnimationFrame(animate);
    };

    if (isTouchDevice) {
      // Set initial frame
      const firstFrame = ANIMATION_FRAMES[0];
      setFaceSrc(`/faces/${gridToFilename(firstFrame.px, firstFrame.py)}`);
      animationId = requestAnimationFrame(animate);
    } else {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (isTouchDevice) {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [prefersReducedMotion, updateFaceFromClient]);

  const skills = ['TypeScript', 'Next.js', 'tRPC', 'Prisma', 'AI SDK', 'Claude Code'];

  return (
    <StyledAboutSection id="about" ref={revealContainer}>
      <h2 className="numbered-heading">About Me</h2>

      <div className="inner">
        <StyledText>
          <div>
            <p>
              I'm a software engineer at Rotolo Consultants, who genuinely just loves building
              stuff. Code is a means to an end for me—the end being solving problems and shipping
              things. Every bad UX interaction I have on the internet makes me want to build
              something better.
            </p>

            <p>
              I obsess over user experience and love making product decisions—figuring out patterns,
              designing features, thinking through how things should work. I'm constantly
              prototyping and shipping, whether it's a silly idea or something serious.
            </p>

            <p>
              Lately, I've been deep in{' '}
              <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noreferrer">
                Claude Code
              </a>
              , building my own plugins and agents to automate everything I can. It's been amazing
              for rapid prototyping and iterating on ideas quickly.
            </p>

            <p>Here's what I've been working with:</p>
          </div>

          <ul className="skills-list">
            {skills && skills.map((skill, i) => <li key={i}>{skill}</li>)}
          </ul>
        </StyledText>

        <StyledPic>
          <div className="wrapper" ref={faceContainerRef}>
            <img className="img" src={faceSrc} alt="Headshot" />
          </div>
        </StyledPic>
      </div>
    </StyledAboutSection>
  );
};

export default About;
