import Image from 'next/image'
import { DotButton, useDotButton } from './dot-button'
import {
  PrevButton,
  NextButton,
  usePrevNextButtons
} from './arrow-buttons'
import useEmblaCarousel from 'embla-carousel-react'
import { CenteredImage } from '../centered-image'

export function EmblaCarousel({ slides, options, photos }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(options)

  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi)

  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick
  } = usePrevNextButtons(emblaApi)

  return (
        <section className="embla">
            <div className="embla__viewport" ref={emblaRef}>
                <div className="embla__container">
                    {photos.map((photo, index) => (
                        <div className="embla__slide" key={index}>
                            <div className="flex justify-center items-center w-full h-full">
                                <div className='relative group w-full'>
                                    <Image
                                        src={photo.photoUrl}
                                        width={photo.photoUrl.width ?? 1240}
                                        height={photo.photoUrl.height ?? 1240}
                                        style={{ width: '100%', height: 'auto' }}
                                        sizes="(min-width: 800px) 768px, 100vw"
                                        alt={photo.title ? photo.title : "Photo Gallery Picture"}
                                    />
                                    <div className={`absolute left-0 bottom-0 w-fit h-fit pl-2 pr-8 py-0 text-white bg-[#bdd2c9] ${photo.show ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity ease-in-out delay-150 duration-300 [clip-path:polygon(0_0,100%_0%,95%_100%,0_100%)]`}>
                                        {
                                            photo.title ? <Title title={photo.title} subtitle={photo.subtitle}/> : <></>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-center w-full mt-1 text-black">
                <div className="embla__buttons">
                    <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
                    <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
                </div>

                { false && 
                    <div className="embla__dots">
                        {scrollSnaps.map((_, index) => (
                            <DotButton
                                key={index}
                                onClick={() => onDotButtonClick(index)}
                                className={'embla__dot'.concat(
                                    index === selectedIndex ? ' embla__dot--selected' : ''
                                )}
                            />
                        ))}
                    </div>
                }
            </div>
        </section>
  )
}

function Title({title, subtitle}) {
    
    return (
        <div className='flex flex-col justify-start items-start'>
            <span className='text-4xl font-bold'>{title}</span>
            {
                subtitle ? <SubTitle subtitle={subtitle}/> : <></>
            }
        </div>
    )
}

function SubTitle({subtitle}) {
    
    return (
        <span className='text-md font-semibold'>{subtitle}</span>
    )
}




