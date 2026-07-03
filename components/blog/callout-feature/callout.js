export function CallOut({title, text, children}) {
    return(
        <div className="not-prose h-fit w-full my-6 bg-[#EBD9B4] border-[3px] border-black rounded-lg overflow-hidden shadow-[5px_5px_0_0_#1E4C8A]">
            <div className="bg-[#D6541F] border-b-[3px] border-black px-4 py-2">
                <h2 className="m-3 text-4xl font-mono font-bold uppercase tracking-wide text-[#EBD9B4]">{title}</h2>
            </div>
            <div className="px-4 py-3 text-black [&_a]:font-bold [&_a]:text-[#1E4C8A] [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-2 [&_a:hover]:text-[#E0386F]">
                {children ?? <p className="m-0">{text}</p>}
            </div>
        </div>
    )
}
