![image](/docs/images/xkcd_2347.png)

*source: [xkcd/2347]()

# License Rationale
*Extracted from [Metamask blog, by Dan Finlay](https://medium.com/metamask/evolving-our-license-for-the-next-wave-of-metamask-users-81b0b494c09a)

If you have a phone, television, car, or a washing machine, it’s likely that you use free or open source software dozens of times before lunch. Thanks to the thousands of individuals that contribute to Linux, Firefox, Git, Node.js, v8, and many more projects, open source software development has fast become a critical feature of the Internet. Ethereum is no different. Open source development enables public participation and keeps ethereum resilient. Despite open source software solving critical shared problems, fair compensation for the maintenance of these community goods remains a problem, with many different sustainability attempts — from donations, to grants, to copyleft licenses.

Since the first release of MetaMask, we’ve provided a browser extension to connect more than 4 million individuals to Blockhain with a permissive MIT license. However, in order to compete with products that exist upstream of our wallet in the web3 tech stack, such as web browsers, and to continue providing the most resilient and secure browser and wallet experience on Ethereum for the next wave of users, we need to evolve our approach and set parameters around how developers can distribute versions of MetaMask and be fairly compensated.

Going forward, MetaMask will be published under a new license. For all end users and most application developers and non-profits, this will not have any impact: MetaMask will continue to be free. Developers will have the same access to the MetaMask APIs that they’ve had in the past, enabling the same kinds of applications as before. MetaMask will continue publishing and iterating upon the wallet provider API in the public sphere, to ensure a widely cross-compatible ecosystem of applications. MetaMask remains committed to publishing all code in a public repository, so you are welcome to review and audit the codebase, or compete in our bug bounties (and more bounties coming soon on HackerOne).

Developers can still copy, modify, and distribute versions of MetaMask. Yet for developers that copy, modify, or fork the MetaMask codebase for commercial use, we invite you to start a conversation with us to see how we can find a path forward together. For example, if you’ve copied MetaMask and offer it commercially to an audience larger than 10,000 monthly active users, we would like to enter into a formal commercial agreement.
MetaMask has provided an essential and free community service to this point, and to continue to do so, we need a sustainable future for what we see as a public good: a safe wallet.

To contribute to more adoptable standards and secure practices, the MetaMask team will continue to publish many of its internal modules as permissive open-source licensed modules. These include code related to key management, the provider API, our permissions system, and much more. We hope that through cross-project reuse, we can help build stronger foundations for our collective projects.

## FAQ

> Why do you need to migrate from an MIT open source license to a tiered proprietary license?

Currently, the status quo for compensating open source maintenance is not tenable. Here is a good article about travails of funding open source software. The bottom line is that a developer shouldn’t have to decide between making proprietary software or continuing open source licenses. We also need to be on a fair playing field with other products in the ecosystem that exist upstream of MetaMask in the web3 tech stack. We decided to keep to the principles of open source development with auditable code, but reserve the right to come to enterprise agreements with distributors whose version of MetaMask serves more than 10,000 users. This protects MetaMask from free-riders or upstream competitors from exerting monopolistic control.

>If I’m not a developer, will this change my experience of MetaMask?

No. This will not affect end-users of MetaMask.

> If I’m a developer and copied a version of MetaMask, will this affect me?

Not necessarily. We encourage developers to inspect our code, submit requests, and copy it for the purpose of integrating a secure wallet experience for your application. Many projects, from Bitcoin’s Lightning Network to POA Network, have forked versions of MetaMask. However, if your wallet starts commercially serving more than 10,000 monthly active users, we now reserve the right to establish a proprietary license agreement.

> What is a tiered proprietary license?

MetaMask’s entire codebase is now owned by ConsenSys. We publish code in a public repository for view/inspection. We permit distributing, copying, modifying and creating derivative works non-commercially, or commercially so long as the number of monthly active users of the Resulting Program across all versions thereof and platforms globally do not exceed 10,000 at any time. Any derivative works must also follow this same license restriction.

