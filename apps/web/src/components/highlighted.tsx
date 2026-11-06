import { Fragment } from 'react';

const START = '\u0001';
const END = '\u0002';

// Turns the markers placed by the database around matched words into <mark> elements.
export function Highlighted({ text }: { text: string }) {
  const parts = text.split(START);
  return (
    <>
      {parts.map((part, index) => {
        if (index === 0) {
          return <Fragment key={index}>{part}</Fragment>;
        }
        const [marked = '', rest = ''] = part.split(END);
        return (
          <Fragment key={index}>
            <mark>{marked}</mark>
            {rest}
          </Fragment>
        );
      })}
    </>
  );
}
