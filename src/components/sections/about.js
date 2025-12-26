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

    const handleScroll = () => {
      if (!faceContainerRef.current) {return;}

      const rect = faceContainerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate where the face is in the viewport (0 = top, 1 = bottom)
      const faceCenter = rect.top + rect.height / 2;
      const normalizedY = (faceCenter / viewportHeight) * 2 - 1;

      // Clamp and quantize: face at bottom of viewport = look up, top = look down
      const clampedY = clamp(normalizedY, -1, 1);
      const py = quantizeToGrid(clampedY);
      const filename = gridToFilename(0, py);
      setFaceSrc(`/faces/${filename}`);
    };

    if (isTouchDevice) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Initialize on load
    } else {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (isTouchDevice) {
        window.removeEventListener('scroll', handleScroll);
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
              I'm a software engineer at Rotolo Consultants who genuinely just loves building stuff.
              Code is a means to an end for me—the end being solving problems and shipping things.
              Every bad UX interaction I have on the internet makes me want to build something
              better.
            </p>

            <p>
              I obsess over user experience and love making product decisions—figuring out patterns,
              designing features, thinking through how things should work. I'm constantly
              prototyping and shipping, whether it's a silly idea or something serious.
            </p>

            <p>
              Lately I've been deep in{' '}
              <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noreferrer">
                Claude Code
              </a>
              , building my own plugins and agents to automate everything I can. It's been amazing
              for rapid prototyping and iterating on ideas quickly.
            </p>

            <p>Here's what I've been working with lately:</p>
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
