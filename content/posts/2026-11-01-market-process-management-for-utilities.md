---
title: Market Process Management for Utilities: what it is and how to get started
date: 2026-11-01
summary: Market communication is where many IS-U landscapes hide the most custom code. Market Process Management for Utilities gives that logic a structured home in SAP S/4HANA Utilities. Here is how it evolved, how it is built on the Application Process Engine, and how to get started, during or after your move to S/4HANA.
tags: Market processes
---

In a deregulated energy market, a supplier, a grid operator and a metering company all need the same facts about a customer at the same time. A move-in, a supplier switch or a meter change triggers a chain of messages between market parties, usually in formats defined by the regulator. In many SAP IS-U landscapes, this market communication is where most of the custom code lives.

SAP has a dedicated answer for this on S/4HANA: **Market Process Management for Utilities (MPM)**. I wrote an [introduction to Market Process Management on SAP Community](https://community.sap.com/t5/sap-for-utilities-blog-posts/market-process-management-for-utilities-an-introduction/ba-p/13696025). In this article I go one step further: where the solution comes from, how it is built and how to get started.

## From IDE to MPM: how we got here

Market communication in SAP for Utilities has gone through three generations:

1. **IDE (Intercompany Data Exchange)** in IS-U on ECC: the original framework for exchanging data with other market participants.
2. **IDEX (Intercompany Data Exchange Extended)**, an add-on on ECC that introduced the *process document*: one object that shows a complete business process and all the messages that belong to it.
3. **Market Process Management for Utilities (MPM)** on S/4HANA, which brings the process document concept into S/4HANA in a modern, configurable framework.

## APE: the engine underneath MPM

MPM runs on the **Application Process Engine (APE)**, its underlying component. APE is the engine that executes the market processes: it runs the configured process steps, checks, deadlines and exceptions, and keeps track of every process in a *process document*. Messages to and from market partners travel in *transfer documents*.

On top of that, Fiori apps let business users monitor process documents, transfer documents and exceptions. So when people talk about MPM, APE is the technology doing the work behind the scenes.

The direction is clear: market process logic moves out of scattered custom code and into a framework you configure and monitor.

## What MPM does

MPM lets you model, execute and monitor market processes in SAP S/4HANA Utilities, including the message handling with market partners. Three ideas make the difference:

- **Process documents** give you one place to follow a market process from the first incoming message to the last update in your system.
- **Configured process steps, checks and deadlines** replace logic that used to be hard-coded in function modules.
- **Exception handling and monitoring** show business users what is stuck and why, without a developer reading logs.

In Germany, SAP goes one step further with SAP Market Communication for Utilities, a cloud service that takes over the communication part, while the processing stays in S/4HANA Utilities. That cloud service is released for the German market only. Utilities in Belgium, the Netherlands and other countries work with the market rules of their own country, so the processes need to be built for that market.

## When to start: during or after your S/4HANA move

You do not have to introduce MPM at the same time as your move to S/4HANA. Both routes work:

- **During the move:** if you are redesigning your landscape anyway, you can rebuild market processes in MPM straight away and avoid carrying old custom logic into S/4HANA.
- **After the move:** many utilities first move to S/4HANA Utilities with their existing market communication, and adopt MPM afterwards, process by process. That keeps the scope of the migration under control and spreads the effort.

Whichever route you choose, these steps help:

- **Know what you have.** Make an inventory of your current market processes and every custom extension around them. This is often the largest block of custom code in a utility.
- **Start with the processes that hurt most.** Begin with the processes that cause the most exceptions or change most often, and move the rest step by step.
- **Organise monitoring.** Plan monitoring and exception handling as a business process, with clear owners in the back office, not as a technical afterthought.
- **Keep the core clean.** Keep country-specific market logic in the framework and its extension points, so that future upgrades do not turn into market communication projects.
- **Test with the market.** Include tests with real market partners and the market test environments in your plan, not only internal tests.

## The bottom line

Market rules will keep changing. A utility that runs its market processes in a structured, monitored framework can absorb those changes as configuration work instead of a development project. That is the real value of Market Process Management for Utilities.

Wondering how and when to bring your market communication into MPM, during or after your S/4HANA move? [Get in touch](mailto:pieter.bangels@thevaluechain.eu).
