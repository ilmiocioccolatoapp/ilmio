import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../services/store_session.dart';
import '../services/api_service.dart';
import 'gallery_screen.dart';

class SessionGate extends StatefulWidget {
  final StoreSessionController? controller;
  const SessionGate({super.key, this.controller});
  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> with WidgetsBindingObserver {
  late final StoreSessionController controller =
      widget.controller ?? StoreSessionController();
  final code = TextEditingController(), password = TextEditingController();
  String? selectedBrand;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    controller.addListener(changed);
    unawaited(controller.restore());
    timer = Timer.periodic(
        const Duration(minutes: 3), (_) => unawaited(controller.sync()));
  }

  void changed() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(controller.sync());
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    controller.removeListener(changed);
    if (widget.controller == null) controller.dispose();
    code.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> settings() async {
    final info = await PackageInfo.fromPlatform();
    if (!mounted) return;
    await showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(controller.storeName,
                          style: Theme.of(ctx).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      Text('App ${info.version} (${info.buildNumber})'),
                      const Text('Contact your brand administrator for help.'),
                      if (controller.offline)
                        const Text(
                            'Offline menu. Connect within 72 hours to renew access.'),
                      TextButton(
                          onPressed: () => unawaited(controller.sync()),
                          child: const Text('Sync now')),
                      TextButton(
                          onPressed: () async {
                            Navigator.pop(ctx);
                            selectedBrand = null;
                            await controller.logout();
                          },
                          child: const Text('Log out'))
                    ]))));
  }

  @override
  Widget build(BuildContext context) {
    if (controller.busy && controller.menu == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!controller.signedIn) {
      return Scaffold(
          body: Center(
              child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: SingleChildScrollView(
                      padding: const EdgeInsets.all(28),
                      child: AutofillGroup(
                          child:
                              Column(mainAxisSize: MainAxisSize.min, children: [
                        Text('Store sign in',
                            style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 24),
                        TextField(
                            controller: code,
                            autocorrect: false,
                            autofillHints: const [AutofillHints.username],
                            decoration:
                                const InputDecoration(labelText: 'Store ID')),
                        TextField(
                            controller: password,
                            obscureText: true,
                            autofillHints: const [AutofillHints.password],
                            decoration:
                                const InputDecoration(labelText: 'Password'),
                            onSubmitted: (_) => signIn()),
                        if (controller.error != null)
                          Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(controller.error!)),
                        const SizedBox(height: 24),
                        FilledButton(
                            onPressed: controller.busy ? null : signIn,
                            child: const Text('Sign in'))
                      ]))))));
    }
    final brands =
        List<Map<String, dynamic>>.from(controller.menu?['brands'] ?? []);
    final matches = brands.where((b) => b['id'] == selectedBrand);
    final brand = matches.isNotEmpty
        ? matches.first
        : brands.length == 1
            ? brands.first
            : null;
    if (brand == null) {
      return Scaffold(
          appBar: AppBar(title: Text(controller.storeName), actions: [
            IconButton(
                onPressed: settings,
                icon: const Icon(Icons.settings),
                tooltip: 'Settings')
          ]),
          body: brands.isEmpty
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(controller.error ??
                      'No published menus are assigned to this store.'),
                  TextButton(
                      onPressed: () => unawaited(controller.sync()),
                      child: const Text('Retry sync'))
                ]))
              : GridView.extent(
                  maxCrossAxisExtent: 380,
                  padding: const EdgeInsets.all(28),
                  mainAxisSpacing: 20,
                  crossAxisSpacing: 20,
                  childAspectRatio: 1.5,
                  children: brands
                      .map((b) => Card(
                          child: InkWell(
                              onTap: () =>
                                  setState(() => selectedBrand = b['id']),
                              child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    if (b['logoUrl'] != null)
                                      CachedNetworkImage(
                                          imageUrl: b['logoUrl'],
                                          height: 70,
                                          errorWidget: (_, url, error) =>
                                              const Icon(Icons.restaurant)),
                                    Text(b['name'],
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineSmall)
                                  ]))))
                      .toList()));
    }
    final hex =
        (brand['primaryColor'] ?? '#334155').toString().replaceFirst('#', '');
    final color = Color(int.tryParse('ff$hex', radix: 16) ?? 0xff334155);
    return Theme(
        data: Theme.of(context).copyWith(
            colorScheme:
                ColorScheme.fromSeed(seedColor: color, primary: color)),
        child: Scaffold(
            body: Stack(children: [
          Positioned.fill(
              child: GalleryScreen(
                  key: ValueKey(
                      '${controller.storeId}:${brand['id']}:${brand['menuVersion']}'),
                  apiService: PublishedBrandApi(brand),
                  brandName: brand['name'])),
          Positioned(
              top: 8,
              left: 8,
              child: SafeArea(
                  child: Row(children: [
                if (brands.length > 1)
                  FilledButton.tonalIcon(
                      onPressed: () => setState(() => selectedBrand = null),
                      icon: const Icon(Icons.storefront),
                      label: const Text('Brands')),
                IconButton.filledTonal(
                    onPressed: settings,
                    icon: const Icon(Icons.settings),
                    tooltip: 'Settings'),
                if (controller.offline) const Chip(label: Text('Offline'))
              ])))
        ])));
  }

  Future<void> signIn() async {
    final secret = password.text;
    password.clear();
    selectedBrand = null;
    await controller.login(code.text, secret);
  }
}
